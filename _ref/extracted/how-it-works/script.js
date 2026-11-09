
(function(){
  // step panel switcher
  var btns = document.querySelectorAll('.hw-step-btn');
  var panels = document.querySelectorAll('.hw-panel');
  function activate(target){
    btns.forEach(function(b){ b.classList.toggle('active', b.dataset.panel === target); });
    panels.forEach(function(p){
      p.classList.toggle('active', p.id === 'panel-' + target);
    });
  }
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){ activate(btn.dataset.panel); });
  });

  // hamburger toggle
  var nav = document.querySelector('.hw-nav');
  var toggle = document.querySelector('.hw-toggle');
  var mobNav = document.querySelector('.hw-mob-nav');
  if(toggle){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('menu-open');
    });
    document.addEventListener('click', function(e){
      if(!nav.contains(e.target) && mobNav && !mobNav.contains(e.target)){
        nav.classList.remove('menu-open');
      }
    });
  }
})();
