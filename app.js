(() => {
'use strict';
const D=window.WAN_COMPARE,S=window.WAN_STORY,$=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>typeof x==='number'&&Number.isFinite(x),fmt=(x,p=5)=>num(x)?x.toFixed(p):'未测';
const sec=x=>!num(x)?'未独立记录':x>=60?(x/60).toFixed(2)+' 分钟':x.toFixed(2)+' 秒';
const pre=x=>'<pre><code>'+esc(typeof x==='string'?x:JSON.stringify(x,null,2))+'</code></pre>';
const option=(id,label)=>`<option value="${esc(id)}">${esc(label)}</option>`;
const jobs=new Map(D.jobs.map(j=>[j.id,j])),calls=[...S.earlyInterviews,...D.calls],callMap=new Map(calls.map(c=>[c.id,c]));
const originals=['truck','water','bicycle'],names={truck:'卡车',water:'倒水',bicycle:'骑车'};
const cohorts=new Map(D.cohorts.map(c=>[c.id,c.label]));
const online=j=>D.calls.filter(c=>c.jobId===j.id&&['online','historical'].includes(c.kind)).sort((a,b)=>(a.step??0)-(b.step??0));
const getJob=(sample,cohort,arm)=>D.jobs.find(j=>j.sampleId===sample&&j.cohort===cohort&&(!arm||j.arm===arm));
const getBaseline=j=>(['A_fixed','A_090'].includes(j.arm)||(j.cohort==='freshprefix'&&j.arm==='alpha_0.9'))?j:jobs.get(j.baselineId);
const body=c=>{for(const m of [...(c.request?.messages||[])].reverse())if(m.role==='user'&&typeof m.content==='string'){try{return JSON.parse(m.content);}catch{}}return {};};
const failed=c=>/fail|error|timeout|reject|429/i.test(c.status||'');
const usage=c=>{const u=c.usage||{};return `输入 ${u.prompt_tokens??u.input_tokens??'未知'} / 输出 ${u.completion_tokens??u.output_tokens??'未知'} tokens`;};
const download=(data,name,type='application/json')=>{const text=typeof data==='string'?data:JSON.stringify(data,null,2);const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
const table=(heads,rows)=>`<table><thead><tr>${heads.map(h=>'<th>'+h+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
const delta=(v,b,m)=>{if(!num(v)||!num(b))return '<span class="caption">无配对</span>';const d=v-b,cls=m?.direction==='context'?'context':d>1e-10?'up':d< -1e-10?'down':'same';return `<span class="delta ${cls}">${d>0?'+':''}${d.toFixed(m?.precision??5)}</span>`;};
const findings=(kind,title,text)=>`<div class="finding ${kind}"><span>${kind==='observed'?'已观察到':kind==='negative'?'本轮负结果':'未判定'}</span><h4>${title}</h4><p>${text}</p></div>`;
function movie(j,cls='primary-video'){
 return `<video class="${cls}" controls playsinline preload="none" poster="${esc(j.poster)}" aria-label="${esc(j.label)} · ${esc(j.prompt)}">${j.previewVideo?'<source src="'+esc(j.previewVideo)+'" type="video/webm">':''}<source src="${esc(j.video)}" type="video/mp4"></video>`;
}
function inputBrief(j){
 const cs=online(j);if(!cs.length)return j.cohort==='freshprefix'?'固定候选分支；没有本分支独立Agent调用。':j.arm==='C_replay'?'固定下降规则；没有Agent调用。':'固定参数baseline；没有Agent调用。';
 const p=body(cs.at(-1)),memory=p.completed_development_experience;
 return `实际决策 ${cs.length} 次 · task prompt ${p.task?.generation_prompt?'已发送':'未包含完整文本'} · Attention ${p.state?.attention?'有':'隐藏/未提供'} · 论文卡 ${p.input_context?.paper_evidence?.length??'无独立字段'} · 末次本视频历史 ${p.history?.length??0} 条 · 跨视频经验 ${memory?memory.records.length+' 条':'未发送'}`;
}
function resultCard(j,key,title){
 const b=getBaseline(j),self=b?.id===j.id,cs=online(j),t=S.timings.find(t=>t.jobId===j.id);
 return `<article class="video-card result-card" data-job="${esc(j.id)}"><div class="video-media"><div class="video-heading"><strong>${esc(title||j.label)}</strong><p class="video-cohort">${esc(cohorts.get(j.cohort))} · seed ${esc(j.seed)} · ${j.totalSteps} 总步</p></div>${movie(j)}<div class="video-stats"><span>生成（含Agent） <b>${sec(j.timing?.totalSeconds)}</b></span><span>Agent累计 <b>${sec(j.timing?.agentSeconds)}</b></span>${t?'<span>全流程 <b>'+sec(t.wallSeconds)+'</b></span><span>成片反馈API <b>'+sec(t.feedbackApiSeconds)+'</b></span>':''}<a href="${esc(j.video)}" download>下载原始MP4</a></div><p class="input-brief">${esc(inputBrief(j))}</p><div class="trace-strip">${esc((j.trace||[]).map(t=>'step '+(t.applies_from_step??t.step)+'：α '+t.alpha).join(' → '))}</div>${b&&!self?'<details class="baseline-player"><summary>播放本批 baseline：'+esc(b.label)+'</summary>'+movie(b,'baseline-video')+'<p class="caption">'+esc(b.prompt)+' · seed '+b.seed+' · '+b.totalSteps+'步</p></details>':''}<div class="media-actions"><button class="secondary" data-download-job="${esc(j.id)}">下载本视频数据与实际请求</button></div>${cs.length?'<p class="caption media-note">展开右侧input可按步骤查看；完整公开回答另列在本部分下方。</p>':''}</div>${window.WAN_VIDEO_DETAILS.render(j,key)}</article>`;
}
function mountResults(id,html){$(id).querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause();});$(id).innerHTML=html;window.WAN_VIDEO_DETAILS.bind($(id));}
const labelMap={missing_inputs_ranked:'最想补充哪些输入',uncertainties:'仍不确定什么',keep_vs_change:'保持与改变的理由',testable_predictions:'可检验预测',unsupported_claims:'没有证据的说法',evidence_refs:'引用的证据',prediction_checks:'对过去预测的核对',missing_inputs:'还缺什么输入',next_test:'建议的下一项验证',rank:'优先级',input:'所需输入',uncertainty:'解决的问题',available_when:'可获得时机',minimal_ablation:'建议对照',reason:'理由',status:'状态',limitations:'限制',observed_issue:'观察到了什么',reasoning_summary:'公开推理与选择理由',expected_effect:'预期效果',confidence:'置信度',selected_alpha:'选择的α',selected_beta:'选择的β'};
function rich(v,depth=0){if(v==null)return '<p class="caption">未记录</p>';if(typeof v!=='object')return '<p>'+esc(v)+'</p>';if(depth>5)return pre(v);if(Array.isArray(v))return '<ol>'+v.map(x=>'<li>'+rich(x,depth+1)+'</li>').join('')+'</ol>';return Object.entries(v).map(([k,x])=>`<div class="response-field"><h4>${esc(labelMap[k]||k)}</h4>${rich(x,depth+1)}</div>`).join('');}
function question(c){
 for(const m of [...(c.request?.messages||[])].reverse())if(m.role==='user'){
  if(typeof m.content==='string'){try{const p=JSON.parse(m.content);if(p.question)return p.question;}catch{return m.content;}}
  if(Array.isArray(m.content)){for(const b of m.content)if(b.type==='text'){try{const p=JSON.parse(b.text);if(p.question)return p.question;}catch{}}}
 }
 return c.kind==='feedback'?(c.request?.messages||[]).find(m=>m.role==='system')?.content:'完整问题与事实输入保存在下方实际user消息中。';
}
function callContents(c){
 let answer=c.decision;if((!answer||(typeof answer==='object'&&!Object.keys(answer).length))&&c.publicResponse){try{answer=JSON.parse(c.publicResponse);}catch{answer=c.publicResponse;}}
 return `<div class="call-meta">${esc(c.model||'模型未记录')} · API ${sec(c.apiSeconds)}${num(c.wallSeconds)?' · 记录总用时 '+sec(c.wallSeconds):''} · ${esc(usage(c))}${num(c.effectiveFromStep)?' · 第'+c.effectiveFromStep+'步起生效':''}</div>${c.error?'<p class="failure-message">'+esc(c.error)+'</p>':''}<div class="bubble question"><div class="speaker">研究者／实际提问</div><p>${esc(question(c))}</p>${c.frames?.length?'<div class="frame-strip">'+c.frames.map(f=>'<img src="'+esc(f)+'" alt="实际发送的时序帧" loading="lazy">').join('')+'</div><p class="caption">实际8帧；反馈文字进入后续经验，图像没有直接附到后续决策。</p>':''}<details class="actual-messages"><summary>完整实际input：system、user与API参数</summary>${pre(c.request)}</details></div><div class="bubble"><div class="speaker">模型公开回答／原文保留</div>${rich(answer)}<details class="original-response"><summary>公开原始回答与Token统计</summary>${pre(c.publicResponse??null)}${pre(c.usage??null)}</details></div><button class="secondary" data-download-call="${esc(c.id)}">下载这次完整公开记录</button>`;
}
function callCard(c,open=false){return `<details class="call-record${failed(c)?' unsuccessful':''}" data-call="${esc(c.id)}"${open?' open':''}><summary><span class="call-title">${esc(names[c.sampleId]||c.label)} · ${esc(c.label)}${num(c.step)?' · step '+c.step:''}</span><span class="badge${failed(c)?' failed':''}">${failed(c)?esc(c.status):c.decision?.selected_alpha!=null?'α '+esc(c.decision.selected_alpha):'已返回'}</span><span class="summary-time">API ${sec(c.apiSeconds)}</span></summary><div class="call-content">${open?callContents(c):''}</div></details>`;}
function bindCalls(root){root.querySelectorAll('.call-record').forEach(el=>el.addEventListener('toggle',()=>{if(el.open&&!el.querySelector('.call-content').innerHTML)el.querySelector('.call-content').innerHTML=callContents(callMap.get(el.dataset.call));}));}
function renderCalls(id,cs,openFirst=false){$(id).innerHTML=cs.length?cs.map((c,i)=>callCard(c,openFirst&&i===0)).join(''):'<p class="caption">没有独立Agent调用。</p>';bindCalls($(id));}
function versionScores(){
 const qm=D.metrics.find(m=>m.key==='videoscore.visual_quality'),vm=D.metrics.find(m=>m.key==='vbench.imaging_quality');
 $('promptVersionScores').innerHTML=table(['原三题','旧十步A · VS画质','中性十步B · VS画质','版本差 B−A','旧A · VB画质','中性B · VB画质','版本差 B−A'],originals.map(s=>{const a=getJob(s,'legacy10'),b=getJob(s,'core10','I11');return [names[s],fmt(a.metrics[qm.key]),fmt(b.metrics[qm.key]),delta(b.metrics[qm.key],a.metrics[qm.key],qm),fmt(a.metrics[vm.key]),fmt(b.metrics[vm.key]),delta(b.metrics[vm.key],a.metrics[vm.key],vm)];}));
}
function renderOld(){const s=$('promptScene').value;mountResults('oldVideos',resultCard(getJob(s,'legacy10'),'old-A','A · 早期十步探索版')+resultCard(getJob(s,'core10','I11'),'old-B','B · 上一轮中性十步版'));}
const fieldNames={task:'任务prompt、seed、样本ID',state:'当前步／总步、α、scheduler timestep、外推倍率与latent统计','state.attention':'far_mass、目标占比、归一化熵、KL与层／头／query采样',probes:'同Q/K下各候选α的响应',history:'本视频先前观察、动作和预测',temporal_observation_check:'上次→本次的变化与预测核对','input_context.paper_evidence':'六张论文证据卡',constraints:'参数边界',policy:'决策策略与合法候选',remaining_budget:'剩余调用／费用／GPU预算'};
function describe(p,k){
 if(k==='task')return p.task?.generation_prompt?'有独立任务prompt／seed／样本ID；当前画面未提供':'没有独立task字段；实际消息中未包含完整生成prompt';
 if(k==='state')return '已有：去噪状态、当前α、外推倍率、latent统计；noise_level为空，保留scheduler timestep';
 if(k==='state.attention')return p.state?.attention?.sampling_summary?'已有，摘要＋采样范围（层0/14/29、head0）':'已有，包括采样层行统计';
 if(k==='probes')return '已有：保持与合法±0.05候选的far_mass／KL／熵响应';
 if(k==='history')return '已有视频内历史'+(p.history?.some(h=>'previous_prediction_unverified' in h)?'及先前预测':'，没有跨视频结果');
 if(k==='temporal_observation_check')return p.temporal_observation_check?'有独立的前后观测变化和混杂说明':'无独立核对字段';
 if(k==='input_context.paper_evidence')return p.input_context?.paper_evidence?.length+' 张结构化卡片';
 if(k==='constraints')return 'α范围0.5–1；Wan的β为空';
 if(k==='policy')return '保持／提高／降低均可；只选已提供候选';
 return '已有预算字段；未知实际金额不填0';
}
function renderInputChanges(){
 const {legacy:a,neutral:b,interview:c}=S.promptRepresentatives;
 $('oldInputDiff').innerHTML=table(['输入字段／含义','A · 早期十步','B · 中性十步'],Object.keys(fieldNames).map(k=>['<code>'+esc(k)+'</code><small>'+fieldNames[k]+'</small>',k==='input_context.paper_evidence'?'无独立卡片字段；论文背景在system中':describe(a.payload,k),describe(b.payload,k)]));
 $('newInputDiff').innerHTML=table(['从B到C的变化','B · 访谈前中性版','C · 访谈后共享版'],[
  ['任务、state、Attention、Probe','已有','继续传递；没有新增可控模型参数'],['本视频history与预测核对','已有','继续传递，并在system要求核对'],['六张论文证据卡','已有','沿用；不是这次新加的论文数据'],['<code>completed_development_experience</code>','没有跨视频完成经验','新增：第1条0条，第10条带前9条，实际零省略'],['成片VBench结果','当前在线决策没有完成片结果','以前完成视频的四项VBench进入经验'],['视觉反馈','在线决策没有当前画面','成片另抽8帧反思；反思摘要进入后续经验'],['system提示','中性版 '+b.system.length+' 字符','新增经验利用协议；合计 '+c.system.length+' 字符'],['Agent输出','α＋观察／理由／预测／置信度','不新增动作参数；Wan β仍为空']]);
 $('newMemoryFields').innerHTML=table(['新增经验字段','实际内容'],[['sample','以前视频的prompt、seed、样本ID'],['decisions','观察摘要、所选α、置信度、预测摘录、实际生效步'],['trace','各步实际α轨迹'],['scores','VBench整体画质、尾段画质、主体一致性、运动程度；VideoScore不回灌'],['reflection','核对旧预测、不确定性、缺失输入、下一项验证；每字段前600字符'],['episode_id / hash / omitted_records','案例身份、完整原文hash、截断标记与省略条数']]);
 $('addedSystem').innerHTML=pre(S.addedSystem);
 $('fullSystems').innerHTML=Object.entries(S.promptRepresentatives).map(([k,v])=>'<details><summary>'+esc({legacy:'A旧探索版',neutral:'B中性版',interview:'C访谈共享版'}[k])+' · system全文 · '+v.system.length+'字符</summary>'+pre(v.system)+'</details>').join('');
}
const formal=D.calls.filter(c=>c.kind==='interview'),preflight=D.calls.filter(c=>c.study==='R064-feedback');
const interviewRecords=[...S.earlyInterviews,...formal,...preflight];
function renderInterviews(){let cs=interviewRecords;const filter=$('interviewFilter').value;if(filter==='formal')cs=formal;if(filter==='early')cs=S.earlyInterviews;if(filter==='feedback')cs=preflight;renderCalls('interviewList',cs);}
function renderNew(){const j=jobs.get($('newEpisode').value);mountResults('newVideo',resultCard(j,'new-'+j.sequence,'C · 访谈后共享版 · 第'+j.sequence+'条'));}
function promptConclusions(){
 const equal=originals.filter(s=>getJob(s,'core10','I11').sha256===getJob(s,'core10','A_fixed').sha256).length;
 $('promptConclusion').innerHTML=findings('observed','旧新版本确实出现不同动作和分数','A版三条都下降到0.7，B版三条保持0.9；VideoScore画质卡车上升、倒水与骑车下降，VBench画质三条上升。上表保留两个评分器的取舍。')+findings('negative','B版相对自己的baseline没有收益',`${equal}/3 视频与本批固定0.9 baseline同字节，九项指标差值全0；增加了Agent调用耗时。`)+findings('unknown','C版新增经验与视觉反思，但没有证明提示带来提升','十条20次均保持0.9。C版同时改变任务、总步数和经验输入，缺少只改prompt的配对，不能把版本差全部归因提示。');
}
function renderSharedOverview(){
 const r=D.shared.result;$('sharedStats').innerHTML=[['10 / 10','实际完成视频'],['0 → 9','每次携带先前经验'],['20 ＋ 10','在线决策＋成片反思'],[sec(r.queue_wall_seconds),'本轮全流程']].map(([v,t])=>'<div><strong>'+v+'</strong><span>'+t+'</span></div>').join('');
 $('sharedGallery').innerHTML=D.shared.rows.map(row=>{const j=jobs.get(row.jobId);return `<article class="gallery-card" data-job="${esc(j.id)}"><div class="gallery-top"><b>${row.sequence.toString().padStart(2,'0')}</b><span>实际经验 ${row.actualPriorCounts.join(' / ')}</span></div>${movie(j,'gallery-video')}<p>${esc(j.prompt)}</p><div class="gallery-scores">VB画质 ${fmt(j.metrics['vbench.imaging_quality'])} · VS画质 ${fmt(j.metrics['videoscore.visual_quality'])}</div><button class="secondary" data-shared-job="${esc(j.id)}">输入 · 决策 · 时间 · 反思</button></article>`;}).join('');
 $('sharedMetrics').innerHTML=table(['序号／prompt','前序经验',...D.metrics.map(m=>esc(m.suite)+'<br>'+esc(m.label)),'Baseline'],D.shared.rows.map(row=>{const j=jobs.get(row.jobId);return [row.sequence+' · '+esc(j.prompt),row.actualPriorCounts.join('/'),...D.metrics.map(m=>fmt(j.metrics[m.key],m.precision)),'未生成配对'];}));
 $('sharedTimes').innerHTML=table(['视频','全流程','生成（含Agent）','其中Agent','其中观测','VideoScore内部','视觉反馈API','其余（含VB／加载／调度）','输入／输出tokens'],S.timings.map(t=>[t.sequence,sec(t.wallSeconds),sec(t.generationSeconds),sec(t.agentSecondsWithinGeneration),sec(t.observationSecondsWithinGeneration),sec(t.videoScoreEvaluationSeconds),sec(t.feedbackApiSeconds),sec(t.otherSecondsIncludingVBenchLoadingAndDispatch),t.usage.prompt_tokens+' / '+t.usage.completion_tokens]));
 $('sharedConclusion').innerHTML=findings('observed','共享内容确实进入了后续请求','第1至10条实际携带0至9条先前经验，省略0条；后18次决策中17次公开理由引用了完整前序episode ID。')+findings('negative','没有出现越来越会调参的行为','20次在线动作全部保持α=0.9。新链从空经验开始，之前已跑的0.85/0.9/0.95候选结果没有加入初始经验池；本轮经验全是0.9轨迹。')+findings('unknown','共享相对baseline的画质增益尚无实测值','没有同prompt、同seed、同12步设置的不共享配对，也没有第二遍；不同题目分数高低不能证明越跑越好。');
}
function renderSharedDetail(){const j=jobs.get($('sharedEpisode').value),t=S.timings.find(t=>t.jobId===j.id);mountResults('sharedDetail',resultCard(j,'shared-'+j.sequence,'共享第'+j.sequence+'条 · '+(j.sequence-1)+'条前序经验'));renderCalls('sharedOnline',online(j),true);renderCalls('sharedReflection',[callMap.get(t.feedbackId)],true);}
function frequencyPair(){const s=$('frequencyScene').value,cohort=$('tenVersion').value;return [getJob(s,'partner5','E_kimi'),getJob(s,cohort,cohort==='core10'?'I11':'legacy10')];}
function frequencyRows(){const [five,ten]=frequencyPair(),b5=getBaseline(five),b10=getBaseline(ten);return D.metrics.map(m=>[esc(m.label)+'<small>'+esc(m.suite)+'</small>',fmt(b5?.metrics[m.key]),fmt(five.metrics[m.key]),delta(five.metrics[m.key],b5?.metrics[m.key],m),fmt(b10?.metrics[m.key]),fmt(ten.metrics[m.key]),delta(ten.metrics[m.key],b10?.metrics[m.key],m)]);}
function renderFrequency(){
 const [five,ten]=frequencyPair();mountResults('frequencyVideos',resultCard(five,'freq-five','每5步 · 搭档Agent')+resultCard(ten,'freq-ten','每10步 · '+(ten.cohort==='core10'?'中性版':'早期探索版')));
 $('frequencyMetrics').innerHTML=table(['指标','5步Baseline','5步Agent','5步Δ','10步Baseline','10步Agent','10步Δ'],frequencyRows());
 const groups=[five,ten];$('frequencyTrajectories').innerHTML=groups.map(j=>'<div class="trajectory"><h4>'+esc(j.label)+'</h4><p>'+esc((j.trace||[]).map(t=>'step '+(t.applies_from_step??t.step)+'：'+t.alpha).join(' → '))+'</p><p>生成 '+sec(j.timing.totalSeconds)+' · Agent '+sec(j.timing.agentSeconds)+'</p></div>').join('');
 const c5=online(five),c10=online(ten),p5=body(c5.at(-1)),p10=body(c10.at(-1)),r5=c5[0].request,r10=c10[0].request;
 $('frequencyDifferences').innerHTML=table(['实际差异','5步','10步'],[['在线决策次数',c5.length,c10.length],['system长度',r5.messages[0].content.length+' 字符',r10.messages[0].content.length+' 字符'],['system是否同文',r5.messages[0].content===r10.messages[0].content?'同文':'不同',r5.messages[0].content===r10.messages[0].content?'同文':'不同'],['独立任务prompt字段',p5.task?.generation_prompt?'有':'无',p10.task?.generation_prompt?'有':'无'],['末次输入的视频内历史',p5.history?.length??0,p10.history?.length??0],['最大输出tokens',r5.max_completion_tokens,r10.max_completion_tokens],['运行环境Torch',esc(five.timing.raw?.torch),esc(ten.timing.raw?.torch)]]);
 $('frequencyDecisions').innerHTML='<div><h4>5步：每次决策与公开理由</h4><div id="fiveCalls"></div></div><div><h4>10步：每次决策与公开理由</h4><div id="tenCalls"></div></div>';renderCalls('fiveCalls',c5,true);renderCalls('tenCalls',c10,true);
 const m=D.metrics.find(m=>m.key==='videoscore.visual_quality'),b5=getBaseline(five),b10=getBaseline(ten);
 $('frequencyConclusion').innerHTML=findings('observed',names[$('frequencyScene').value]+'的实测对照',`5步VideoScore画质 ${fmt(five.metrics[m.key])}，相对本批baseline ${delta(five.metrics[m.key],b5?.metrics[m.key],m)}；10步 ${fmt(ten.metrics[m.key])}，相对本批baseline ${delta(ten.metrics[m.key],b10?.metrics[m.key],m)}。其余八项见上表。`)+findings(ten.cohort==='core10'?'negative':'unknown',ten.cohort==='core10'?'动作差异已观察到，十步中性版没有调参收益':'早期十步有下降动作，但缺同批baseline',ten.cohort==='core10'?'五步多数向下调α；中性十步原三题全部保持0.9，成片与各自baseline同字节。':'早期十步三题均下降到0.7，system与五步同文；末次历史、输出次数与环境仍须一起核对，不能回填其他批次baseline。')+findings('unknown','不能把版本差只解释为接入频率效果','这批5步和10步的实际输入／提示／环境差异已逐项列出。可报告两版本各自相对baseline的实测变化，尚未完成只改接入频率的对照。');
}
function renderArchive(){const j=jobs.get($('archiveJob').value);mountResults('archiveVideo',resultCard(j,'archive','留痕库 · '+j.label));renderCalls('archiveCalls',online(j));}
function renderStudy(){const study=$('studyFilter').value,cs=study==='all'?calls:calls.filter(c=>c.study===study);$('callSelect').innerHTML=cs.map(c=>option(c.id,(names[c.sampleId]||c.sampleId||'')+' · '+c.study+' · '+c.label+' · '+c.status)).join('');renderSelectedCall();}
function renderSelectedCall(){const c=callMap.get($('callSelect').value);renderCalls('callDetail',c?[c]:[],true);}
function observedFindings(){
 const c=getJob('water','core10','C_replay'),b=getBaseline(c),a=getJob('truck','core10','I01'),ab=getBaseline(a),qm=D.metrics.find(m=>m.key==='videoscore.visual_quality'),vm=D.metrics.find(m=>m.key==='vbench.imaging_quality');
 $('observedFindings').innerHTML=findings('observed','倒水：简单固定下降规则有局部评分收益',`VideoScore画质 ${fmt(b.metrics[qm.key])}→${fmt(c.metrics[qm.key])}；时序一致性2.515625→3.343750。VBench画质 ${fmt(b.metrics[vm.key])}→${fmt(c.metrics[vm.key])}，主体一致性也下降。<button class="secondary" data-open-job="${c.id}">看视频与本批baseline</button>`)+findings('observed','卡车：仅实时输入引发调参，评分有取舍',`α实际升到0.95／1。VS画质 ${fmt(ab.metrics[qm.key])}→${fmt(a.metrics[qm.key])}；VB画质 ${fmt(ab.metrics[vm.key])}→${fmt(a.metrics[vm.key])}。<button class="secondary" data-open-job="${a.id}">看实际input与理由</button>`)+findings('negative','论文＋实时Agent的三条主配对均没有收益','三条保持0.9，视频与本批baseline同字节；新共享链也未改变α。不能把调用次数或公开理由变长写成画质收益。');
}
function activeChapter(){const hash=location.hash.slice(1).split('/')[0];return ({compare:'prompt',interviews:'prompt',decisions:'frequency'}[hash]||(['prompt','shared','frequency','archive'].includes(hash)?hash:'prompt'));}
function showChapter(){const id=activeChapter();document.querySelectorAll('.chapter').forEach(el=>el.hidden=el.id!==id);document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.dataset.tab===id);if(a.dataset.tab===id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause();});if(location.hash==='#interviews')$('interviews').scrollIntoView();}
function openJob(id){$('archiveJob').value=id;renderArchive();location.hash='archive';showChapter();$('archiveVideo').scrollIntoView({behavior:'smooth'});}
function csv(rows,name){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download('\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),name,'text/csv;charset=utf-8');}
// Initial render uses only retained records; no backend or model calls.
$('recordCount').textContent=D.jobs.length+' 条视频记录 · '+(formal.length+S.earlyInterviews.length)+' 次访谈尝试 · 12 次成片反馈 · '+calls.length+' 条研究调用留痕';
$('versionMap').innerHTML=[['A','早期十步探索版','原三题 · 50步 · 旧system · 无跨视频经验'],['B','上一轮中性十步版','原三题 · 50步 · 六张证据卡 · 无跨视频经验'],['C','访谈后共享版','新十题 · 12步 · 新增经验与视觉反思']].map(([v,t,s])=>'<div><b>'+v+'</b><strong>'+t+'</strong><span>'+s+'</span></div>').join('');
for(const id of ['promptScene','frequencyScene'])$(id).innerHTML=originals.map(s=>option(s,names[s])).join('');
for(const id of ['newEpisode','sharedEpisode'])$(id).innerHTML=D.shared.rows.map(r=>option(r.jobId,r.sequence+' · '+r.prompt)).join('');
$('interviewCount').textContent=formal.length+'条正式分阶段访谈 ＋ 初期'+S.earlyInterviews.length+'次尝试（2合格、2接口失败、2格式拒绝） ＋ 2次成片反馈预检。';
$('archiveJob').innerHTML=D.jobs.map(j=>option(j.id,cohorts.get(j.cohort)+' · '+(names[j.sampleId]||j.sampleId)+' · '+j.label)).join('');
$('studyFilter').innerHTML=option('all','全部 '+calls.length+' 条记录')+[...new Set(calls.map(c=>c.study))].map(s=>option(s,s+' · '+calls.filter(c=>c.study===s).length+'条')).join('');
versionScores();renderOld();renderInputChanges();renderInterviews();renderNew();promptConclusions();renderSharedOverview();renderSharedDetail();renderFrequency();observedFindings();renderArchive();renderStudy();showChapter();
$('promptScene').addEventListener('change',renderOld);$('interviewFilter').addEventListener('change',renderInterviews);$('newEpisode').addEventListener('change',renderNew);$('sharedEpisode').addEventListener('change',renderSharedDetail);$('frequencyScene').addEventListener('change',renderFrequency);$('tenVersion').addEventListener('change',renderFrequency);$('archiveJob').addEventListener('change',renderArchive);$('studyFilter').addEventListener('change',renderStudy);$('callSelect').addEventListener('change',renderSelectedCall);window.addEventListener('hashchange',showChapter);
$('expandInterviews').addEventListener('click',()=>$('interviewList').querySelectorAll('.call-record').forEach(d=>d.open=true));$('collapseInterviews').addEventListener('click',()=>$('interviewList').querySelectorAll('.call-record').forEach(d=>d.open=false));
$('downloadInterviews').addEventListener('click',()=>download(interviewRecords,'wan_all_interviews_and_preflight_feedback.json'));
$('downloadAllCalls').addEventListener('click',()=>download(calls,'wan_all_public_research_records.json'));
$('sharedCsv').addEventListener('click',()=>csv([['sequence','prompt','prior_records',...D.metrics.map(m=>m.key),'wall_seconds','generation_seconds_including_agent','agent_seconds_within_generation','observer_seconds_within_generation','videoscore_internal_seconds','visual_feedback_api_seconds','other_seconds_including_vbench','input_tokens','output_tokens'],...D.shared.rows.map(r=>{const j=jobs.get(r.jobId),t=S.timings.find(t=>t.jobId===j.id);return [r.sequence,j.prompt,r.expectedPrior,...D.metrics.map(m=>j.metrics[m.key]),t.wallSeconds,t.generationSeconds,t.agentSecondsWithinGeneration,t.observationSecondsWithinGeneration,t.videoScoreEvaluationSeconds,t.feedbackApiSeconds,t.otherSecondsIncludingVBenchLoadingAndDispatch,t.usage.prompt_tokens,t.usage.completion_tokens];})],'wan_ten_shared_metrics_and_times.csv'));
$('frequencyCsv').addEventListener('click',()=>{const [five,ten]=frequencyPair();csv([['sample','group','metric','value','baseline','delta'],...[five,ten].flatMap(j=>D.metrics.map(m=>{const b=getBaseline(j),v=j.metrics[m.key],bv=b?.metrics[m.key];return [j.sampleId,j.label,m.key,v,bv,num(v)&&num(bv)?v-bv:null];}))],'wan_five_ten_baseline_comparison.csv');});
document.addEventListener('click',async event=>{
 const el=event.target.closest('button');if(!el)return;
 if(el.dataset.downloadCall)download(callMap.get(el.dataset.downloadCall),'call_'+el.dataset.downloadCall+'.json');
 if(el.dataset.downloadJob){const j=jobs.get(el.dataset.downloadJob);download({job:j,matched_baseline:getBaseline(j)??null,actual_calls:online(j),timing:S.timings.find(t=>t.jobId===j.id)??null},'video_'+j.id+'.json');}
 if(el.dataset.openJob)openJob(el.dataset.openJob);
 if(el.dataset.sharedJob){$('sharedEpisode').value=el.dataset.sharedJob;renderSharedDetail();$('sharedDetail').scrollIntoView({behavior:'smooth'});}
 if(el.dataset.playScope){const videos=[...$(el.dataset.playScope).querySelectorAll('.primary-video')];await Promise.allSettled(videos.map(v=>v.play()));}
 if(el.dataset.pauseScope)$(el.dataset.pauseScope).querySelectorAll('video').forEach(v=>v.pause());
 if(el.dataset.resetScope)$(el.dataset.resetScope).querySelectorAll('video').forEach(v=>{v.pause();v.currentTime=0;});
});
window.WAN_EVIDENCE_RENDERERS={resultCard,callCard,bindCalls,renderCalls,body,rich,movie,usage};
})();
