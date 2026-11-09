
(function(){
  /* ── MOBILE NAV TOGGLE ── */
  var navToggle=document.querySelector('.nav-toggle');
  var siteHeader=document.querySelector('.site-header');
  var mobileNav=document.querySelector('.mobile-nav');
  if(navToggle&&siteHeader&&mobileNav){
    navToggle.addEventListener('click',function(){
      var isOpen=siteHeader.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded',isOpen?'true':'false');
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){
        siteHeader.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded','false');
      });
    });
  }

  /* ── HERO wake/sleep ── */
  var hero=document.querySelector('.hero');
  if(hero){
    var heroTimer;
    function heroWake(){
      hero.classList.add('hero-awake');
      hero.classList.remove('hero-resting');
      clearTimeout(heroTimer);
      heroTimer=setTimeout(function(){
        hero.classList.remove('hero-awake');
        hero.classList.add('hero-resting');
      },1900);
    }
    hero.addEventListener('pointermove',heroWake,{passive:true});
    hero.addEventListener('pointerdown',heroWake,{passive:true});
    heroWake();
  }

  function bindEmbedPlayer(iframe,type,onPlay,onStop,onReady){
    if(type==='youtube'){
      var bind=function(){
        var player=new YT.Player(iframe,{events:{
          onReady:function(){onReady&&onReady(player);},
          onStateChange:function(e){
            if(e.data===YT.PlayerState.PLAYING)onPlay();
            else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.ENDED)onStop();
          }
        }});
      };
      if(window.YT&&window.YT.Player)bind();
      else{
        var prev=window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady=function(){prev&&prev();bind();};
      }
    }else if(type==='vimeo'){
      var bindV=function(){
        var player=new Vimeo.Player(iframe);
        onReady&&onReady(player);
        player.on('play',onPlay);
        player.on('pause',onStop);
        player.on('ended',onStop);
      };
      if(window.Vimeo&&window.Vimeo.Player)bindV();
      else{
        var tries=0,iv=setInterval(function(){
          tries++;
          if(window.Vimeo&&window.Vimeo.Player){clearInterval(iv);bindV();}
          else if(tries>40)clearInterval(iv);
        },250);
      }
    }
  }

  /* ── FILM CAROUSEL ── */
  (function(){
    var vp=document.getElementById('film-viewport');
    if(!vp)return;
    var track=document.getElementById('film-track');
    var cards=Array.from(vp.querySelectorAll('.carousel-card'));
    var firstReal=0,lastReal=cards.length-1;
    if(track&&cards.length>1){
      var lastClone=cards[cards.length-1].cloneNode(true);
      var firstClone=cards[0].cloneNode(true);
      lastClone.setAttribute('data-clone','true');
      firstClone.setAttribute('data-clone','true');
      track.insertBefore(lastClone,track.firstChild);
      track.appendChild(firstClone);
      cards=Array.from(vp.querySelectorAll('.carousel-card'));
      firstReal=1;
      lastReal=cards.length-2;
    }
    var prevBtn=document.getElementById('film-prev');
    var nextBtn=document.getElementById('film-next');
    var titleEl=document.getElementById('film-title');
    var tabsEl=document.getElementById('film-tabs');
    var active=0,dragging=false,startX=0,startScroll=0,paused=false,autoTimer,videoPlaying=false;
    var shell=document.getElementById('film-reel');
    var activeEmbeds={};

    function markPlaying(idx,on){
      var card=cards[idx];
      if(card)card.classList.toggle('is-playing',on);
      if(shell)shell.classList.toggle('is-playing',on);
      if(on){videoPlaying=true;clearInterval(autoTimer);}
      else{videoPlaying=false;startAuto();}
    }

    function stopOtherEmbeds(exceptIdx){
      Object.keys(activeEmbeds).forEach(function(k){
        k=+k;
        if(k===exceptIdx)return;
        var e=activeEmbeds[k];
        if(e.iframe&&e.iframe.parentNode)e.iframe.parentNode.removeChild(e.iframe);
        if(e.img)e.img.style.display='';
        if(e.playBtn){e.playBtn.style.display='';e.playBtn.textContent='▶';}
        markPlaying(k,false);
        delete activeEmbeds[k];
      });
    }


    cards.forEach(function(card,i){
      var btn=document.createElement('button');
      btn.textContent=String(i+1).padStart(2,'0');
      btn.setAttribute('aria-label','Show '+(card.dataset.title||'film '+(i+1)));
      btn.addEventListener('click',function(){centerCard(i);});
      tabsEl&&tabsEl.appendChild(btn);
    });

    function updateUI(i){
      active=i;
      cards.forEach(function(c,j){c.classList.toggle('is-active',j===i);});
      tabsEl&&tabsEl.querySelectorAll('button').forEach(function(b,j){b.classList.toggle('active',j===i);});
      if(titleEl)titleEl.textContent=cards[i]?cards[i].dataset.title||'':'';
    }

    function centerCard(i,behavior){
      behavior=behavior||'smooth';
      var card=cards[i];if(!card)return;
      var target=card.offsetLeft-(vp.clientWidth-card.offsetWidth)/2;
      vp.scrollTo({left:target,behavior:behavior});
      updateUI(i);
    }

    function findNearest(){
      var mid=vp.scrollLeft+vp.clientWidth/2,nearest=0,best=Infinity;
      cards.forEach(function(c,i){
        var d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);
        if(d<best){best=d;nearest=i;}
      });
      return nearest;
    }

    function initialCenter(){centerCard(firstReal,'instant');}
    requestAnimationFrame(initialCenter);
    window.addEventListener('load',initialCenter);
    setTimeout(initialCenter,400);

    function correctIfClone(){
      if(dragging)return;
      if(active===0&&firstReal!==0){
        requestAnimationFrame(function(){centerCard(lastReal,'instant');});
      }else if(active===cards.length-1&&lastReal!==cards.length-1){
        requestAnimationFrame(function(){centerCard(firstReal,'instant');});
      }
    }
    vp.addEventListener('scrollend',correctIfClone);

    function startAuto(){
      clearInterval(autoTimer);
      autoTimer=setInterval(function(){
        if(!paused&&!dragging&&!videoPlaying)centerCard((active+1)%cards.length);
      },6000);
    }
    startAuto();

    vp.addEventListener('pointerdown',function(e){
      if(e.target.closest('button'))return;
      paused=true;dragging=true;startX=e.clientX;startScroll=vp.scrollLeft;
      vp.setPointerCapture(e.pointerId);vp.classList.add('is-dragging');
    });
    vp.addEventListener('pointermove',function(e){
      if(!dragging)return;
      vp.scrollLeft=startScroll-(e.clientX-startX);
    });
    function endDrag(){
      if(!dragging)return;
      dragging=false;vp.classList.remove('is-dragging');
      centerCard(findNearest());
      setTimeout(function(){paused=false;},500);
    }
    vp.addEventListener('pointerup',endDrag);
    vp.addEventListener('pointercancel',endDrag);

    if(shell){
      shell.addEventListener('mouseenter',function(){paused=true;});
      shell.addEventListener('mouseleave',function(){if(!dragging)paused=false;});
    }

    prevBtn&&prevBtn.addEventListener('click',function(){centerCard((active-1+cards.length)%cards.length);});
    nextBtn&&nextBtn.addEventListener('click',function(){centerCard((active+1)%cards.length);});

    cards.forEach(function(card,idx){
      var playBtn=card.querySelector('.reel-play');
      var video=card.querySelector('video');
      var embedSlot=card.querySelector('.embed-slot');
      var timeEl=card.querySelector('.reel-time');
      var progI=card.querySelector('.reel-progress i');
      if(!playBtn)return;
      if(embedSlot){
        var playerInstance=null;
        playBtn.addEventListener('click',function(){
          var src=embedSlot.getAttribute('data-embed-src');
          var type=embedSlot.getAttribute('data-embed-type');
          var existingIframe=embedSlot.querySelector('iframe');
          if(existingIframe){
            if(playerInstance){
              if(type==='youtube'&&playerInstance.playVideo)playerInstance.playVideo();
              else if(type==='vimeo'&&playerInstance.play)playerInstance.play();
            }
            stopOtherEmbeds(idx);
            cards.forEach(function(c,j){if(j!==idx){var v=c.querySelector('video');v&&v.pause();}});
            var img2=card.querySelector('img');
            if(img2)img2.style.display='none';
            playBtn.style.display='none';
            markPlaying(idx,true);
            return;
          }
          if(!src)return;
          stopOtherEmbeds(idx);
          cards.forEach(function(c,j){if(j!==idx){var v=c.querySelector('video');v&&v.pause();}});
          var iframe=document.createElement('iframe');
          var sep=src.indexOf('?')>-1?'&':'?';
          iframe.src=type==='youtube'
            ? src+sep+'autoplay=1&enablejsapi=1&origin='+encodeURIComponent(window.location.origin)
            : src+sep+'autoplay=1';
          iframe.setAttribute('frameborder','0');
          iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
          iframe.setAttribute('allowfullscreen','');
          embedSlot.appendChild(iframe);
          var img=card.querySelector('img');
          if(img)img.style.display='none';
          playBtn.style.display='none';
          activeEmbeds[idx]={iframe:iframe,img:img,playBtn:playBtn};
          markPlaying(idx,true);
          bindEmbedPlayer(iframe,type,function(){
            markPlaying(idx,true);
          },function(){
            markPlaying(idx,false);
            playBtn.style.display='';
            playBtn.textContent='▶';
            delete activeEmbeds[idx];
          },function(p){
            playerInstance=p;
          });
        });
        return;
      }
      if(!video)return;
      playBtn.addEventListener('click',function(){
        stopOtherEmbeds(idx);
        cards.forEach(function(c,j){if(j!==idx)c.querySelector('video')&&c.querySelector('video').pause();});
        if(!video.paused){video.pause();}
        else{
          video.play().then(function(){
            playBtn.textContent='Ⅱ';
            if(timeEl)timeEl.textContent='PLAYING';
            if(progI)progI.classList.add('is-playing');
          }).catch(function(){});
        }
      });
      video.addEventListener('play',function(){
        markPlaying(idx,true);
      });
      video.addEventListener('pause',function(){
        playBtn.textContent='▶';
        if(timeEl)timeEl.textContent='0:00';
        if(progI)progI.classList.remove('is-playing');
        markPlaying(idx,false);
      });
      video.addEventListener('ended',function(){
        playBtn.textContent='▶';
        if(timeEl)timeEl.textContent='0:00';
        if(progI)progI.classList.remove('is-playing');
        markPlaying(idx,false);
      });
    });
  })();

  /* ── PHOTO BEFORE/AFTER CAROUSEL ── */
  (function(){
    var vp=document.getElementById('photo-viewport');
    if(!vp)return;
    var cards=Array.from(vp.querySelectorAll('.carousel-card'));


    var prevBtn=document.getElementById('photo-prev');
    var nextBtn=document.getElementById('photo-next');
    var titleEl=document.getElementById('photo-title');
    var tabsEl=document.getElementById('photo-tabs');
    var active=0,dragging=false,startX=0,startScroll=0;

    cards.forEach(function(card,i){
      var btn=document.createElement('button');
      btn.textContent=String(i+1).padStart(2,'0');
      btn.addEventListener('click',function(){centerCard(i);});
      tabsEl&&tabsEl.appendChild(btn);
    });

    function updateUI(i){
      active=i;
      cards.forEach(function(c,j){
        c.classList.toggle('is-active',j===i);
        var h=c.querySelector('.compare-handle');
        if(h)h.style.pointerEvents=j===i?'':'none';
      });
      tabsEl&&tabsEl.querySelectorAll('button').forEach(function(b,j){b.classList.toggle('active',j===i);});
      if(titleEl)titleEl.textContent=cards[i]?cards[i].dataset.title||'':'';
    }

    function centerCard(i,behavior){
      behavior=behavior||'smooth';
      var card=cards[i];if(!card)return;
      var target=card.offsetLeft-(vp.clientWidth-card.offsetWidth)/2;
      vp.scrollTo({left:target,behavior:behavior});
      updateUI(i);
    }

    function findNearest(){
      var mid=vp.scrollLeft+vp.clientWidth/2,nearest=0,best=Infinity;
      cards.forEach(function(c,i){
        var d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);
        if(d<best){best=d;nearest=i;}
      });
      return nearest;
    }

    requestAnimationFrame(function(){centerCard(0,'auto');});

    vp.addEventListener('pointerdown',function(e){
      if(e.target.closest('button'))return;
      dragging=true;startX=e.clientX;startScroll=vp.scrollLeft;
      vp.setPointerCapture(e.pointerId);vp.classList.add('is-dragging');
    });
    vp.addEventListener('pointermove',function(e){
      if(!dragging)return;
      vp.scrollLeft=startScroll-(e.clientX-startX);
    });
    function endDrag(){
      if(!dragging)return;
      dragging=false;vp.classList.remove('is-dragging');
      centerCard(findNearest());
    }
    vp.addEventListener('pointerup',endDrag);
    vp.addEventListener('pointercancel',endDrag);

    prevBtn&&prevBtn.addEventListener('click',function(){centerCard((active-1+cards.length)%cards.length);});
    nextBtn&&nextBtn.addEventListener('click',function(){centerCard((active+1)%cards.length);});

    cards.forEach(function(card,cardIdx){
      var handle=card.querySelector('.compare-handle');
      var afterEl=card.querySelector('.compare-after');
      var lineEl=card.querySelector('.compare-line');
      var beforeLabel=card.querySelector('.before-label');
      var afterLabel=card.querySelector('.after-label');
      if(!handle||!afterEl)return;

      function setPos(pct){
        pct=Math.max(0,Math.min(100,pct));
        afterEl.style.clipPath='inset(0 0 0 '+pct+'%)';
        handle.style.left=pct+'%';
        if(lineEl)lineEl.style.left=pct+'%';
        handle.setAttribute('aria-valuenow',Math.round(pct));
        if(beforeLabel)beforeLabel.classList.toggle('is-dominant',pct>50);
        if(afterLabel)afterLabel.classList.toggle('is-dominant',pct<=50);
      }

      handle.addEventListener('pointerdown',function(e){
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        var frame=handle.closest('.compare-frame');
        if(!frame)return;
        var r=frame.getBoundingClientRect();
        setPos((e.clientX-r.left)/r.width*100);
      });
      handle.addEventListener('pointermove',function(e){
        if(!handle.hasPointerCapture(e.pointerId))return;
        var frame=handle.closest('.compare-frame');
        if(!frame)return;
        var r=frame.getBoundingClientRect();
        setPos((e.clientX-r.left)/r.width*100);
      });
      handle.addEventListener('keydown',function(e){
        var cur=parseFloat(handle.style.left)||50;
        if(e.key==='ArrowLeft'){e.preventDefault();setPos(cur-2);}
        if(e.key==='ArrowRight'){e.preventDefault();setPos(cur+2);}
      });
      setPos(50);
    });
  })();

  /* ── VERTICAL REELS ── */
  (function(){
    var track=document.getElementById('reels-track');
    if(!track)return;
    var prevBtn=document.getElementById('reels-prev');
    var nextBtn=document.getElementById('reels-next');
    var dragging=false,startX=0,startScroll=0;

    function cardStep(){
      var c=track.querySelector('article');
      return c?c.offsetWidth+18:340;
    }

    track.addEventListener('pointerdown',function(e){
      if(e.target.closest('button'))return;
      dragging=true;startX=e.clientX;startScroll=track.scrollLeft;
      track.setPointerCapture(e.pointerId);track.classList.add('is-dragging');
    });
    track.addEventListener('pointermove',function(e){
      if(!dragging)return;
      track.scrollLeft=startScroll-(e.clientX-startX);
    });
    function endDrag(){
      if(!dragging)return;
      dragging=false;track.classList.remove('is-dragging');
      var step=cardStep();
      track.scrollTo({left:Math.round(track.scrollLeft/step)*step,behavior:'smooth'});
    }
    track.addEventListener('pointerup',endDrag);
    track.addEventListener('pointercancel',endDrag);

    prevBtn&&prevBtn.addEventListener('click',function(){track.scrollBy({left:-cardStep(),behavior:'smooth'});});
    nextBtn&&nextBtn.addEventListener('click',function(){track.scrollBy({left:cardStep(),behavior:'smooth'});});

    var articles=Array.from(track.querySelectorAll('article'));
    var activeEmbeds={};

    function stopOtherReelEmbeds(exceptIdx){
      Object.keys(activeEmbeds).forEach(function(k){
        k=+k;
        if(k===exceptIdx)return;
        var e=activeEmbeds[k];
        if(e.iframe&&e.iframe.parentNode)e.iframe.parentNode.removeChild(e.iframe);
        if(e.img)e.img.style.display='';
        if(e.playBtn){e.playBtn.style.display='';e.playBtn.textContent='▶';}
        delete activeEmbeds[k];
      });
    }

    articles.forEach(function(article,idx){
      var playBtn=article.querySelector('button');
      var video=article.querySelector('video');
      var embedSlot=article.querySelector('.embed-slot');
      if(!playBtn)return;
      if(embedSlot){
        var playerInstance=null;
        playBtn.addEventListener('click',function(e){
          e.stopPropagation();
          var src=embedSlot.getAttribute('data-embed-src');
          var type=embedSlot.getAttribute('data-embed-type');
          var existingIframe=embedSlot.querySelector('iframe');
          var img=article.querySelector('img');
          if(existingIframe){
            if(playerInstance){
              if(type==='youtube'&&playerInstance.playVideo)playerInstance.playVideo();
              else if(type==='vimeo'&&playerInstance.play)playerInstance.play();
            }
            stopOtherReelEmbeds(idx);
            articles.forEach(function(a,j){if(j!==idx){var v=a.querySelector('video');v&&v.pause();}});
            if(img)img.style.display='none';
            playBtn.style.display='none';
            return;
          }
          if(!src)return;
          stopOtherReelEmbeds(idx);
          articles.forEach(function(a,j){if(j!==idx){var v=a.querySelector('video');v&&v.pause();}});
          var iframe=document.createElement('iframe');
          var sep=src.indexOf('?')>-1?'&':'?';
          iframe.src=type==='youtube'
            ? src+sep+'autoplay=1&enablejsapi=1&origin='+encodeURIComponent(window.location.origin)
            : src+sep+'autoplay=1';
          iframe.setAttribute('frameborder','0');
          iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
          iframe.setAttribute('allowfullscreen','');
          embedSlot.appendChild(iframe);
          if(img)img.style.display='none';
          playBtn.style.display='none';
          activeEmbeds[idx]={iframe:iframe,img:img,playBtn:playBtn};
          bindEmbedPlayer(iframe,type,function(){},function(){
            playBtn.style.display='';
            playBtn.textContent='▶';
            delete activeEmbeds[idx];
          },function(p){
            playerInstance=p;
          });
        });
        return;
      }
      if(!video)return;
      playBtn.addEventListener('click',function(e){
        e.stopPropagation();
        stopOtherReelEmbeds(idx);
        articles.forEach(function(a,j){if(j!==idx)a.querySelector('video')&&a.querySelector('video').pause();});
        if(!video.paused){video.pause();}
        else{video.play().then(function(){playBtn.textContent='Ⅱ';}).catch(function(){});}
      });
      video.addEventListener('pause',function(){playBtn.textContent='▶';});
      video.addEventListener('ended',function(){playBtn.textContent='▶';});
    });
  })();

  /* ── TESTIMONIALS ── */
  (function(){
    var dataEl=document.getElementById('testi-data');
    if(!dataEl)return;
    var quotes;
    try{quotes=JSON.parse(dataEl.textContent);}catch(e){return;}
    var cur=0;
    var counterEl=document.getElementById('testi-counter');
    var quoteEl=document.getElementById('testi-quote');
    var authorEl=document.getElementById('testi-author');
    var prevBtn=document.getElementById('testi-prev');
    var nextBtn=document.getElementById('testi-next');

    function render(){
      var q=quotes[cur];
      if(quoteEl)quoteEl.textContent='“'+q.quote+'”';
      if(authorEl)authorEl.textContent=q.author;
      if(counterEl)counterEl.textContent=String(cur+1).padStart(2,'0')+' / '+String(quotes.length).padStart(2,'0');
    }

    prevBtn&&prevBtn.addEventListener('click',function(){cur=(cur-1+quotes.length)%quotes.length;render();});
    nextBtn&&nextBtn.addEventListener('click',function(){cur=(cur+1)%quotes.length;render();});
  })();

  /* ── CONTACT FORM ── */
  (function(){
    var form=document.getElementById('contact-form');
    if(!form)return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]');
      var data={
        name:form.elements['name'].value.trim(),
        email:form.elements['email'].value.trim(),
        service:form.elements['service'].value,
        details:form.elements['message'].value.trim(),
        preferred_datetime:form.elements['preferred_datetime'].value
      };
      if(!data.name||!data.email)return;
      btn.innerHTML='Sending...';
      fetch('/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json();})
        .then(function(j){
          if(j.ok){btn.textContent="Sent! We'll be in touch.";form.reset();}
          else{btn.innerHTML='Try again <span>↗</span>';}
        })
        .catch(function(){btn.innerHTML='Try again <span>↗</span>';});
    });
  })();

  /* ── SCROLL REVEAL + MOUSE PARALLAX ── */
  (function(){
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

    var selector=[
      'section > .section-index','section > h2','.split-heading > *',
      '.milestone-grid article','.problem-list article','.offer-visual',
      '.offer-grid article','.vertical-track article','.testimonial-card',
      '.system-flow article','.founder-photo','.founder-copy > *',
      '.team-grid figure','.faq-list details','.section-cta'
    ].join(',');

    var targets=Array.from(document.querySelectorAll(selector));
    targets.forEach(function(el,i){
      el.classList.add('motion-reveal');
      el.style.setProperty('--delay',(i%4)*80+'ms');
    });

    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.1,rootMargin:'0px 0px -6%'});
    targets.forEach(function(el){observer.observe(el);});

    if(reduced||!matchMedia('(pointer: fine)').matches)return;

    var x=innerWidth/2,y=innerHeight/2,sx=x,sy=y;
    var assets=Array.from(document.querySelectorAll('.parallax-asset'));

    function draw(){
      sx+=(x-sx)*0.11;sy+=(y-sy)*0.11;
      var px=(sx/innerWidth-0.5)*2,py=(sy/innerHeight-0.5)*2;
      assets.forEach(function(asset,i){
        var d=10+(i%3)*6;
        asset.style.setProperty('--parallax-x',px*d+'px');
        asset.style.setProperty('--parallax-y',py*d+'px');
      });
      requestAnimationFrame(draw);
    }

    addEventListener('mousemove',function(e){
      x=e.clientX;y=e.clientY;
      document.documentElement.style.setProperty('--mouse-x',x/innerWidth*100+'%');
      document.documentElement.style.setProperty('--mouse-y',y/innerHeight*100+'%');
    },{passive:true});

    requestAnimationFrame(draw);
  })();

})();


(function(){
  var el = document.getElementById('hero-yt-player');
  if(!el) return;
  function tryPlay(player){ try{ player.playVideo(); }catch(e){} }
  function bindHero(){
    var player = new YT.Player(el, {
      events:{
        onReady: function(e){ tryPlay(e.target); },
        onStateChange: function(e){
          if(e.data === YT.PlayerState.PAUSED) tryPlay(e.target);
        }
      }
    });
  }
  if(window.YT && window.YT.Player){ bindHero(); }
  else{
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function(){ prev&&prev(); bindHero(); };
  }
})();


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


(function(){
  var el=document.getElementById('ct-datetime');
  if(!el||typeof flatpickr==='undefined')return;
  flatpickr(el,{
    enableTime:true,
    dateFormat:'Y-m-d H:i',
    altInput:true,
    altFormat:'D, d M Y — h:i K',
    minDate:'today',
    minuteIncrement:30,
    disableMobile:false
  });
})();
(function(){
  var waBtn=document.getElementById('ct-wa-send');
  if(!waBtn)return;
  var waNum='8801743234673';
  waBtn.addEventListener('click',function(){
    var form=document.getElementById('contact-form');
    if(!form)return;
    var name=form.elements['name'].value.trim();
    var email=form.elements['email'].value.trim();
    var service=form.elements['service'].value;
    var details=form.elements['message'].value.trim();
    var dt=form.elements['preferred_datetime'].value.trim();
    var altEl=form.querySelector('#ct-datetime + input, .flatpickr-input.flatpickr-input');
    var lines=['Hi Fix For Ease, I\'d like to enquire about your services.',''];
    if(name) lines.push('Name: '+name);
    if(email) lines.push('Email: '+email);
    if(service) lines.push('Service: '+service);
    if(details) lines.push('Details: '+details);
    if(dt) lines.push('Preferred time: '+dt);
    var msg=encodeURIComponent(lines.join('\n'));
    window.open('https://wa.me/'+waNum+'?text='+msg,'_blank');
  });
})();
