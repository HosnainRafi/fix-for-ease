(function(){
  var nav=document.querySelector('.fq-nav');
  var toggle=document.querySelector('.fq-toggle');
  var mob=document.querySelector('.fq-mob-nav');
  if(!toggle)return;
  toggle.addEventListener('click',function(){nav.classList.toggle('menu-open');});
  document.addEventListener('click',function(e){if(!nav.contains(e.target)&&mob&&!mob.contains(e.target))nav.classList.remove('menu-open');});
})();
