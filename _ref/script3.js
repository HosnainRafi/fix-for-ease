
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

