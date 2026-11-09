
// ── TYPE SWITCH ──
function switchType(type, btn){
  document.querySelectorAll('.ow-type-section').forEach(s=>s.style.display='none');
  document.querySelectorAll('.ow-switch-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('ow-'+type).style.display='block';
  btn.classList.add('active');
}

// ── CATEGORY FILTER ──
function filterCat(type, cat, btn){
  var grid = document.getElementById(type+'-grid');
  var isPhoto = (type === 'photos');
  var cards = grid.querySelectorAll('[data-cat]');
  var moreBtn = document.getElementById(type+'-more');
  var limit = isPhoto ? 12 : 6;

  cards.forEach(function(c){ c.removeAttribute('data-hidden'); c.style.display=''; });

  var visible = 0;
  cards.forEach(function(c){
    var match = cat === 'all' || c.dataset.cat === cat;
    if(!match){ c.style.display='none'; }
    else { visible++; if(visible > limit) c.setAttribute('data-hidden','1'); }
  });
  cards.forEach(function(c){ if(c.hasAttribute('data-hidden')) c.style.display='none'; });

  // reveal animation
  var revealClass = isPhoto ? 'ph-reveal' : 'vc-reveal';
  var revealSel = isPhoto ? '.ow-photo-item:not([data-hidden]):not([style*="none"])' : '.ow-card:not([data-hidden]):not([style*="none"])';
  var revealed = Array.from(grid.querySelectorAll(revealSel));
  revealed.forEach(function(c,i){
    c.classList.remove(revealClass);
    void c.offsetWidth;
    c.style.animationDelay = (i * 40)+'ms';
    c.classList.add(revealClass);
  });

  var catWrap = document.getElementById(type+'-cats');
  catWrap.querySelectorAll('.ow-cat-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else { catWrap.querySelectorAll('.ow-cat-btn').forEach(function(b){ if(b.dataset.cat===cat) b.classList.add('active'); }); }
  var sel = document.getElementById(type+'-cat-select');
  if(sel) sel.value = cat;

  if(moreBtn){
    var hiddenCount = grid.querySelectorAll('[data-hidden]').length;
    if(hiddenCount > 0){ moreBtn.style.display=''; }
    else{ moreBtn.style.display='none'; }
  }
}

// ── SHOW MORE ──
function showMore(type){
  var grid = document.getElementById(type+'-grid');
  var hidden = Array.from(grid.querySelectorAll('[data-hidden]'));
  var batch = type === 'photos' ? 12 : 6;
  hidden.slice(0, batch).forEach(function(c){ c.removeAttribute('data-hidden'); c.style.display=''; });
  if(grid.querySelectorAll('[data-hidden]').length === 0){
    var btn = document.getElementById(type+'-more');
    if(btn) btn.style.display='none';
  }
}

// ── PHOTO LIGHTBOX ──
var _lbPhotos = [], _lbIdx = 0;
function openPhotoLb(idx){
  var grid = document.getElementById('photos-grid');
  _lbPhotos = Array.from(grid.querySelectorAll('.ow-photo-item:not([data-hidden]):not([style*="none"]) img')).map(function(i){ return i.dataset.src || i.src; });
  // remap idx since hidden items may shift
  var allItems = Array.from(grid.querySelectorAll('.ow-photo-item'));
  var visibleItems = Array.from(grid.querySelectorAll('.ow-photo-item:not([data-hidden]):not([style*="none"])'));
  var item = allItems[idx];
  _lbIdx = visibleItems.indexOf(item);
  if(_lbIdx < 0) _lbIdx = 0;
  document.getElementById('lb-img').src = _lbPhotos[_lbIdx];
  document.getElementById('photo-lb').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function lbNav(dir){
  _lbIdx = (_lbIdx + dir + _lbPhotos.length) % _lbPhotos.length;
  document.getElementById('lb-img').src = _lbPhotos[_lbIdx];
}
function closeLb(){
  document.getElementById('photo-lb').classList.remove('open');
  document.body.style.overflow = '';
}

// ── VIDEO MODAL ──
function openVideo(card){
  var src = card.dataset.embed;
  if(!src) return;
  var autoSrc = src + (src.indexOf('?')>-1 ? '&' : '?') + 'autoplay=1';
  document.getElementById('modal-iframe').src = autoSrc;
  document.getElementById('modal-title').textContent = card.dataset.title;
  document.getElementById('modal-cat').textContent = card.dataset.category;
  var modal = document.querySelector('.ow-modal');
  if(card.dataset.category === 'Vertical Film') modal.classList.add('is-vertical');
  else modal.classList.remove('is-vertical');
  document.getElementById('vid-modal').classList.add('open');
}
function closeModal(){
  document.getElementById('vid-modal').classList.remove('open');
  document.getElementById('modal-iframe').src = '';
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ closeModal(); closeLb(); }
  if(e.key==='ArrowLeft') lbNav(-1);
  if(e.key==='ArrowRight') lbNav(1);
});

// init show-more counts
['photos','videos'].forEach(function(type){
  var btn = document.getElementById(type+'-more');
  if(!btn) return;
  var grid = document.getElementById(type+'-grid');
  var count = grid ? grid.querySelectorAll('[data-hidden]').length : 0;
  if(count === 0){ btn.style.display='none'; }
});


(function(){
  var nav=document.querySelector('.ow-nav');
  var toggle=document.querySelector('.ow-toggle');
  var mob=document.querySelector('.ow-mob-nav');
  if(!toggle)return;
  toggle.addEventListener('click',function(){nav.classList.toggle('menu-open');});
  document.addEventListener('click',function(e){if(!nav.contains(e.target)&&mob&&!mob.contains(e.target))nav.classList.remove('menu-open');});
})();


// blur-up LQIP loader
(function(){
  if(!('IntersectionObserver' in window)) {
    // fallback: just load full images immediately
    document.querySelectorAll('img.blur-up[data-src]').forEach(function(img){
      img.src = img.dataset.src;
      img.classList.add('loaded');
    });
    return;
  }
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting) return;
      var img = entry.target;
      var full = new Image();
      full.onload = function(){
        img.src = img.dataset.src;
        img.classList.add('loaded');
      };
      full.src = img.dataset.src;
      observer.unobserve(img);
    });
  }, { rootMargin: '300px 0px' });

  document.querySelectorAll('img.blur-up[data-src]').forEach(function(img){
    observer.observe(img);
  });
})();
