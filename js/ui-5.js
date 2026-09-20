
function toolsSwitchTab(prefix,name){
  document.querySelectorAll('.'+prefix+'-tab').forEach(function(tab){var active=tab.dataset[prefix+'Tab']===name;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  document.querySelectorAll('.'+prefix+'-panel').forEach(function(panel){var active=panel.dataset[prefix+'Panel']===name;panel.classList.toggle('active',active);panel.hidden=!active;});
}
document.addEventListener('DOMContentLoaded',function(){
  ['fr','gd','bt','jwt'].forEach(function(prefix){
    var tabs=Array.from(document.querySelectorAll('.'+prefix+'-tab'));
    tabs.forEach(function(tab,index){var name=tab.dataset[prefix+'Tab'];tab.id=prefix+'Tab-'+name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',prefix+'Panel-'+name);
      var panel=document.querySelector('[data-'+prefix+'-panel="'+name+'"]');panel.id=prefix+'Panel-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);
      tab.addEventListener('keydown',function(e){var next=e.key==='ArrowRight'?(index+1)%tabs.length:e.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:-1;if(next<0)return;e.preventDefault();tabs[next].click();tabs[next].focus();});
    });toolsSwitchTab(prefix,prefix==='fr'?'list':prefix==='jwt'?'token':'info');
  });
  var name=document.getElementById('cgnNameInput'),preview=document.getElementById('cgnNamePreview');
  name.addEventListener('input',function(){preview.textContent=name.value.trim()||'Nickname kamu';});
  document.getElementById('gdInfoClanId').addEventListener('keydown',function(e){if(e.key==='Enter'&&!document.getElementById('gdInfoBtn').disabled){e.preventDefault();gdLoadInfo();}});
});
