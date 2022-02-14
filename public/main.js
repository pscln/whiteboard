'use strict';

  const WIDTH = 1280;
  const HEIGHT = 720;

  var loaded = false;
  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');
  var clearCountdown = 0;

  var current = {
    color: 'black'
  };
  var drawing = false;
  var userName = "";
  $('#button-logout').hide();

  if(getCookie('color-picker-value') != null){
    $('#color-picker').val(getCookie('color-picker-value'));
  }

  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);
  
  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onMouseDown, false);
  canvas.addEventListener('touchend', onMouseUp, false);
  canvas.addEventListener('touchcancel', onMouseUp, false);
  canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

  for (var i = 0; i < colors.length; i++){
    colors[i].addEventListener('click', onColorUpdate, false);
  }

  socket.on('drawing', onDrawingEvent);
  var eventsQueued = 0;
  socket.on('user-count-change', function(data){
      eventsQueued++;
      $('#user-count').text(data);
      $('#user-count').addClass("wiggle");
      setTimeout(
        function() {
          eventsQueued--;
          if(eventsQueued == 0) {
            $('#user-count').removeClass("wiggle");
          }
        }, 250);
  });

	
	socket.on('user-login', function(data){
		if(data.user == userName){
			return;
		}
		$('#user-list').append('<li class="list-group-item" id="user-other-' + data.id + '">' + data.user + '</li>');
	});

	socket.on('user-login-exists', function(data){
    $('#alert-user-invalid').hide();
		$('#alert-user-alreadyexists').show();
    userNameModal.show();
	});

  socket.on('user-login-invalid', function(data){
    $('#alert-user-alreadyexists').hide();
    $('#alert-user-invalid').show();
    userNameModal.show();
  });
	
	socket.on('user-login-confirm', function(data){
		userNameModal.hide();
    $('#user-you').text(userName + ' (you)');
    $('#button-logout').text('Change name');
    $('#button-logout').show();
    $("#button-clear").prop('disabled', !data.clearButtonAllowed);
    setCookie('user-name', userName, 30);
	});

	socket.on('user-disconnect', function(data){
		$('#user-other-' + data.id).remove();
	});

  socket.on('screen', function(data){
    var img = new Image();
    img.onload = () => context.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = data.image;
    loaded = true;
  });

  socket.on('clear-screen', function(data){
    if(data.clear){
      context.fillStyle = "rgba(255, 255, 255, 255)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      if(!data.force){
        $("#button-clear").prop('disabled', true)
      }
    }else{
      $("#button-clear").prop('disabled', false);
      $('#button-clear-countdown').text('');
    }
  });

  socket.on('clear-screen-countdown', function(data){
    if(data.duration >= 1000){
      clearCountdown = data.duration;
      setTimeout(updateClearCount, 1000);
    }else{
      $('#button-clear-countdown').text('');
    }
  });

  function updateClearCount(){
    clearCountdown -= 1000;
    if(clearCountdown >= 0){
      $('#button-clear-countdown').text(' (' + (clearCountdown / 1000) + ')');
      setTimeout(updateClearCount, 1000);
    }else{
      $('#button-clear-countdown').text('');
    }
  }

	var userNameModal = new bootstrap.Modal(document.getElementById('username-modal'), {
		backdrop: 'static', 
		keyboard: false,
        focus: true,
    });
	$('#alert-user-alreadyexists').hide();
  $('#alert-user-invalid').hide();
	
  var oldUser = getCookie('user-name');

  if(oldUser == null){
    userNameModal.show();
  }else{
    transmitUserName(oldUser);
  }
	
	var userListModal = new bootstrap.Modal(document.getElementById('userlist-modal'), {
		keyboard: true,
        focus: true,
    });

  window.addEventListener('resize', onResize, false);
  onResize();

  function fadeOut(){
    context.fillStyle = "rgba(255, 255, 255, 0.05)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(fadeOut, 1000);
  }

  fadeOut();


  function drawLine(x0, y0, x1, y1, color, emit){
    if(!loaded){ return; }

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color: color
    });
  }

  function onMouseDown(e){
    drawing = true;
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  function onMouseUp(e){
    if (!drawing) { return; }
    drawing = false;
    drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
  }

  function onColorPickerUpdate(e){
    current.color = $('#color-picker').val();
    setCookie('color-picker-value', current.color, 30);
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    socket.emit('screen', {});
  }
  
function userNameSubmit(){
	var name = $('#username-input').val();
	transmitUserName(name);
}

function transmitUserName(name){
  userName = name;
  socket.emit('login-username', {userName: name});
}

function toggleUserList(){
	userListModal.toggle();
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

function logout(){
  setCookie('user-name', '', -1);
  location.reload();
}

function clearScreen(){
  if(!$("#button-clear").is(":disabled")){
    socket.emit('clear-screen', {});
  }
}