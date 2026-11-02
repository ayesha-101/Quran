/* Live controls over the approved illustration assets. No Quran is baked into artwork. */
const plainHomeHTML=homeHTML, plainChildHTML=childHTML, plainSurahHTML=surahHTML, plainGameHTML=gameHTML, plainParentHTML=parentHTML;
function artFrame(name,content){return `<section class="art-screen art-${name}"><img class="art-background" src="art/${name}.webp" alt="" aria-hidden="true">${content}</section>`}
function artText(cls,text,style=''){return `<div class="art-text ${cls}" style="${style}">${text}</div>`}
homeHTML=function(){
 const total=KIDS.reduce((a,k)=>a+S.kids[k.id].stars,0),palms=Math.floor(total/5);
 return artFrame('home',`${artText('home-logo','بستان القرآن')}${artText('home-tagline','حيّاكم في فريجنا')}${artText('home-speech','هلا<br>بعيالي!')}
 ${KIDS.map((k,i)=>{const right=i%2===0?false:true;const x=right?60:29;const y=i<2?37:61;
 return `<button class="art-door door" data-kid="${k.id}" aria-label="باب ${k.name}، ${ar(S.kids[k.id].stars)} نجمة" style="left:${x}%;top:${y}%;"><span class="art-name">${k.name}</span><span class="art-stars">★ ${ar(S.kids[k.id].stars)}</span></button>`}).join('')}
 ${artText('home-pick','اختاري بابج')}<button class="art-parent" id="parentHold" aria-label="للأهل، اضغطي مطولًا أو Shift و Enter"><span class="fill"></span><span>♟ للأهل</span></button>
 <div class="live-grove" aria-label="${ar(palms)} نخلات نمت بنجوم العائلة">${Array.from({length:Math.min(palms,6)},()=>'<span aria-hidden="true">🌴</span>').join('')}</div>`);
};
childHTML=function(id){
 const k=kidById(id),st=S.kids[id],list=kidList(k).goal;
 const active=Math.max(0,list.indexOf(nextToLearn(k))),pageStart=Math.floor(active/6)*6;
 const start=Number.isInteger(st.mapStart)?Math.min(st.mapStart,Math.floor((list.length-1)/6)*6):pageStart;
 const segment=list.slice(start,start+6),positions=[[46,74],[65,65],[77,55],[54,47],[71,38],[77,29]];
 return artFrame('map',`${artText('map-title','رحلة '+k.name)}<button class="map-home art-control" data-home aria-label="البيت">⌂</button>${artText('map-stars','★ '+ar(st.stars))}<img class="map-avatar" src="chars/fatima.png" alt="${k.name}">
 <div class="art-juz"><button data-map-goal="amma" aria-pressed="${st.goal==='amma'}">جزء عمّ</button><button data-map-goal="tabarak" aria-pressed="${st.goal==='tabarak'}">جزء تبارك</button></div>
 ${segment.map((n,i)=>{const [x,y]=positions[i],done=!!st.mem[n],weak=weakCount(id,n)>0,here=n===nextToLearn(k);return `<button class="art-stone ${done?'done':''} ${weak?'review':''} ${here?'here':''}" data-surah="${n}" aria-label="سورة ${sname(n)}${done?'، محفوظة':weak?'، للمراجعة':''}" style="left:${x}%;top:${y}%">${here?`<img src="chars/fatima.png" alt="${k.name}">`:`<b>${done?'✓':ar(start+i+1)}</b>`}<span>${sname(n)}</span></button>`}).join('')}
 <div class="map-pages"><button data-map-page="${Math.max(0,start-6)}" ${start===0?'disabled':''}>→ السابق</button><span>${ar(start+1)}–${ar(Math.min(start+6,list.length))} / ${ar(list.length)}</span><button data-map-page="${start+6}" ${start+6>=list.length?'disabled':''}>التالي ←</button></div>
 ${artText('map-speech','يلا نكمّل!')}<span class="map-prize">جائزتج: الآيباد</span><span class="map-zone fareej-sign">الفريج</span><span class="map-zone souq-sign">السوق</span><span class="map-zone sea-sign">البحر</span><span class="map-zone desert-sign">البر</span>`);
};
surahHTML=function(v){
 const q=QURAN[v.n],st=S.kids[v.kid],tab=v.tab||'listen';
 if(tab==='story'&&v.n===105){const story=STORIES[105];return artFrame('story',`<button class="art-back" data-kid="${v.kid}">→</button>${artText('story-brand','بستان القرآن')}${artText('story-title','وقت الحكاية')}${artText('story-surah','سورة الفيل')}${artText('story-speech','تعالوا نسمع<br>الحكاية')}
 <details class="story-drawer"><summary>الحكاية والمعاني</summary>${story.story.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${esc(story.lesson)}</p></details>
 <div class="story-vocab"><button data-picture-word="الفيل حيوان ضخم وله خرطوم">الفيل</button><button data-picture-word="أبابيل: جماعات كثيرة تأتي وراء بعضها">الطير</button><button data-picture-word="سجّيل: طين صار حجارة">الحجارة</button></div><button class="story-audio" data-story-voice="1">اسمع الحكاية</button><button class="story-listen" data-tab="listen">نسمع السورة</button>`)}
 if(tab!=='listen')return `<div class="illustrated-content illustrated-${tab}">${plainSurahHTML(v)}</div>`;
 return artFrame('listen',`<button class="art-back" data-kid="${v.kid}" aria-label="رجوع إلى الرحلة">→</button><h2 class="listen-title wood-title">نسمع ونردّد</h2>${artText('listen-surah','سورة '+q.name)}
 <article class="live-mushaf mushaf" aria-label="بطاقة المصحف"><div class="ayat">${q.v.map((a,i)=>`<span class="ayah ${i===listen.ayah-1?'on':''} ${v.hide?'hidden-txt':''}" tabindex="0" role="button" aria-label="استمعي للآية ${ar(i+1)}" data-ayah="${i+1}">${esc(a)} <span class="num">${ar(i+1)}</span></span>`).join(' ')}</div></article>
 <div class="live-fatima" id="lbuddy"><div class="bubble" id="lstatus" aria-live="polite">دورج!<br>ردّدي</div></div>
 <button class="art-play" id="lplay" aria-label="${listen.on?'إيقاف التلاوة':'تشغيل التلاوة'}">${listen.on?'إيقاف':'اسمعي'}</button>
 <button class="art-mic" data-repeat-prompt="1" aria-label="دورج، ردّدي الآية">ردّدي</button>
 <div class="art-repeat" role="group" aria-label="عدد مرات التكرار">${[1,3,5].map(r=>`<button data-rep="${r}" aria-pressed="${listen.rep===r}">${ar(r)}×</button>`).join('')}</div>
 <button class="art-next" data-next-ayah="1">التالي ←</button>
 <nav class="lesson-shortcuts">${STORIES[v.n]?'<button data-tab="story">حكاية يدو</button>':''}${st.level>=2?'<button data-tab="play">نلعب</button>':''}<button id="hideTxt">${v.hide?'أظهري الآيات':'أخفي الآيات'}</button></nav>`);
};
gameHTML=function(){
 const c=G.cur;if(!['complete','which','after'].includes(c.t))return `<div class="illustrated-content illustrated-play">${plainGameHTML()}</div>`;
 const q=QURAN[c.n];return artFrame('game',`<button id="gback" class="art-back" aria-label="رجوع">→</button>${artText('game-title',c.t==='complete'?'كمّلي الآية':c.t==='which'?'وين السورة؟':'السورة التالية')}
 <div class="live-dots" aria-label="السؤال ${ar(G.i+1)} من ${ar(G.total)}">${Array.from({length:5},(_,i)=>`<i class="${G.score[i]===true?'ok':G.score[i]===false?'no':i===G.i?'current':''}"></i>`).join('')}</div>
 <section class="game-mushaf" aria-label="بطاقة المصحف التعليمية">${c.t!=='after'?'<button id="hear" aria-label="اسمعي الآية">▶</button>':''}<div class="game-prompt">${c.t==='complete'?'اسمعي وكمّلي':c.t==='which'?'اسمعي واختاري':'شو السورة اللي بعدها؟'}</div><div class="game-verse">${c.t==='complete'?esc(c.start)+' …':c.t==='after'?sname(c.s):'سورة '+q.name}</div>
 <div class="game-answer-list">${c.opts.map((o,i)=>`<button class="opt ${c.t==='complete'?'':'name'}" data-opt="${i}">${c.t==='complete'?esc(o):sname(o)}</button>`).join('')}</div></section>
 <div id="gbuddy" class="live-boy"><div class="bubble">${G.i?'كفو!':'يلا نلعب!'}</div></div><div class="game-footer">اختاري الجواب</div>`);
};
parentHTML=function(){return `<div class="illustrated-content illustrated-parent">${plainParentHTML()}</div>`};
celebrate=function(kid){stopAudio();const d=document.createElement('div');d.className='celebrate illustrated-celebrate';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','شهادة إنجاز '+kid.name);
 d.innerHTML=artFrame('prize',`${artText('prize-title','كفو يا '+kid.name+'!')}${artText('prize-speech','تستاهلين<br>يا الغالية!')}<article class="art-certificate certificate"><h2>شهادة إنجاز</h2><strong>${kid.name}</strong><p>أتممتِ حفظ<br>${GOALS[S.kids[kid.id].goal].name}</p><small>مبارك يا بطلة</small></article><button class="prize-close" id="closePrize">نكمّل الرحلة</button><button class="prize-print" id="printPrize">احفظي الشهادة</button>`);
 const previous=document.activeElement;const close=()=>{d.remove();previous?.isConnected&&previous.focus()};d.querySelector('#closePrize').onclick=close;d.querySelector('#printPrize').onclick=()=>window.print();d.onkeydown=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){e.preventDefault();(document.activeElement.id==='closePrize'?d.querySelector('#printPrize'):d.querySelector('#closePrize')).focus()}};document.body.appendChild(d);d.querySelector('#closePrize').focus();speak('prize',null);
};
const baseBind=bind;
bind=function(){baseBind();const app=document.getElementById('app'),oldClick=app.onclick;
 app.onclick=e=>{const b=e.target.closest('button');if(b){const d=b.dataset;
 if(d.pictureWord)return toast(d.pictureWord);
 if(d.mapPage!==undefined){S.kids[view.kid].mapStart=+d.mapPage;return render()}
 if(d.mapGoal){S.kids[view.kid].goal=d.mapGoal;delete S.kids[view.kid].mapStart;save();return render()}
 if(d.nextAyah){listenStop();listen.ayah=listen.ayah>=QURAN[view.n].v.length?1:listen.ayah+1;return render()}
 if(d.repeatPrompt){setMood('lbuddy',null,'دورج! ردّدي');return}
 }oldClick?.(e)};
 app.onkeydown=e=>{if(e.target.matches('.ayah[role=button]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.click()}};
};
render();
