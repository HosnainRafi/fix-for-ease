
(function(){
  var el=document.getElementById('ct-datetime');
  if(!el||typeof flatpickr==='undefined')return;
  flatpickr(el,{
    enableTime:true,
    dateFormat:'Y-m-d H:i',
    altInput:true,
    altFormat:'D, d M Y â€” h:i K',
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

