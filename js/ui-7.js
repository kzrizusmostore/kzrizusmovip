
document.addEventListener('DOMContentLoaded',function(){
  var input=caiEl('caiItemInput'),timer;
  input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(caiUpdatePreview,300);});
  input.addEventListener('change',caiUpdatePreview);caiUpdatePreview();
  [['ctlRegionInput','REGION','ID'],['ctlLangInput','BAHASA','id']].forEach(function(entry){
    var field=document.getElementById(entry[0]),label=document.querySelector('label[for="'+entry[0]+'"]');
    function refresh(){label.lastChild.textContent=entry[1]+(field.value.trim().toLowerCase()===entry[2].toLowerCase()?' · INDONESIA':'');}
    field.addEventListener('input',refresh);refresh();
  });
});
