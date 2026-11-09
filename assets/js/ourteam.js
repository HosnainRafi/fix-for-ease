(function(){
  var nav=document.querySelector('.ot-nav');
  var toggle=document.querySelector('.ot-toggle');
  var mob=document.querySelector('.ot-mob-nav');
  if(!toggle)return;
  toggle.addEventListener('click',function(){nav.classList.toggle('menu-open');});
  document.addEventListener('click',function(e){if(!nav.contains(e.target)&&mob&&!mob.contains(e.target))nav.classList.remove('menu-open');});
})();
