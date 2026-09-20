
document.addEventListener('DOMContentLoaded',function(){
  document.getElementById('ctlMapCodeInput').addEventListener('keydown',function(e){if(e.key==='Enter'&&!CTL_STATE.busy){e.preventDefault();ctlCheck();}});
  var group=document.querySelector('.ctl-tabs');group.setAttribute('role','group');
  group.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.classList.contains('active')));});
  document.querySelectorAll('.jwt-method-btn').forEach(function(b){b.setAttribute('aria-pressed',String(b.classList.contains('active')));});
});
