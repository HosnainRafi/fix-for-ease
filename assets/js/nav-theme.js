(function(){
  var header = document.querySelector('.site-header');
  var hero = document.querySelector('.hero');
  if(!header || !hero) return;
  function updateNav(){
    if(hero.getBoundingClientRect().bottom < 80) header.classList.add('nav-light');
    else header.classList.remove('nav-light');
  }
  window.addEventListener('scroll', updateNav, {passive:true});
  updateNav();
})();
