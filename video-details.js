/* R072: summaries are derived from the actual public request, never arm labels. */
(() => {
'use strict';
const D=window.WAN_COMPARE,jobMap=new Map(D.jobs.map(j=>[j.id,j]));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>typeof x==='number'&&Number.isFinite(x);
const fmt=(v,p=4)=>num(v)?v.toFixed(p):'未测';
const pre=x=>'<pre>'+esc(typeof x==='string'?x:JSON.stringify(x,null,2))+'</pre>';
const arr=x=>Array.isArray(x)?x:[];
const cardLabels={'wan-mechanism':'α作用机制','wan-over-suppression':'过强衰减与一致性风险','wan-default':'论文默认α=0.9','wan-t6-3x':'Wan三倍外推对照结果','wan-location':'注意力作用位置实验','wan-first-frame':'首帧处理与边界'};
const callsFor=j=>D.calls.filter(c=>c.jobId===j.id&&(c.kind==='online'||c.kind==='historical')).sort((a,b)=>(a.step??0)-(b.step??0));
function payload(c){
 for(const m of [...(c.request?.messages||[])].reverse())if(m.role==='user'&&typeof m.content==='string'){
  try{const p=JSON.parse(m.content);if(p&&typeof p==='object'&&!Array.isArray(p))return p;}catch{}
 }
 return null;
}
function baseline(j){const b=['A_fixed','A_090'].includes(j.arm)?j:jobMap.get(j.baselineId);return b&&b.sampleId===j.sampleId&&b.totalSteps===j.totalSteps&&b.cohort===j.cohort?b:null;}
const row=(title,body,cls='')=>`<div class="input-row ${cls}"><dt>${title}</dt><dd>${body}</dd></div>`;
const rawDetail=(title,v)=>`<details class="input-detail"><summary>${esc(title)}</summary>${pre(v)}</details>`;
function metrics(j){
 const b=baseline(j),self=b?.id===j.id;
 let note=!b?'缺少同设置 baseline：仅展示实测值，不计算升降。':self?'本视频是本批 baseline，右侧列出参考值。':`相对本批 ${esc(b.label)}；同 prompt / seed ${esc(j.seed)} / ${j.totalSteps} 步。`;
 if(j.cohort==='freshprefix')note+=' 此处参考为同一 step40 前缀的 α=0.9 分支。';
 const changes=D.metrics.filter(m=>m.direction!=='context').map(m=>({m,v:j.metrics[m.key],bv:b?.metrics[m.key]})).filter(x=>num(x.v)&&num(x.bv));
 const count=sign=>changes.filter(x=>sign===0?Math.abs(x.v-x.bv)<=1e-10:sign*(x.v-x.bv)>1e-10).length;
 const summary=b&&!self?`<div class="delta-summary"><span>评分上升 <b>${count(1)}</b></span><span>下降 <b>${count(-1)}</b></span><span>持平 <b>${count(0)}</b></span><small>不含动态程度；分数升降不等于显著改善。</small></div>`:'';
 return `<section class="side-block inline-metrics" aria-label="${esc(j.label)}的指标与baseline对比"><div class="side-title"><h3>指标与 baseline 对比</h3>${b&&!self?`<a href="${esc(b.video)}" target="_blank" rel="noopener">播放对应 baseline ↗</a>`:''}</div><p class="baseline-note ${b?'':'no-baseline'}">${note}</p>${summary}<div class="table-wrap"><table><thead><tr><th>指标</th><th>本视频</th><th>Baseline</th><th>变化 Δ</th></tr></thead><tbody>${D.metrics.map(m=>{
  const v=j.metrics[m.key],bv=b?.metrics[m.key],delta=!self&&num(v)&&num(bv)?v-bv:null;
  const cls=m.direction==='context'?'context':delta>1e-10?'up':delta< -1e-10?'down':'same';
  return `<tr data-metric="${esc(m.key)}"><td>${esc(m.label)}<small>${esc(m.suite)}</small></td><td>${fmt(v,m.precision??4)}</td><td>${fmt(bv,m.precision??4)}</td><td class="delta ${cls}" data-delta="${num(delta)?delta:''}">${num(delta)?(delta>0?'+':'')+delta.toFixed(m.precision??4):'—'}</td></tr>`;
 }).join('')}</tbody></table></div><p class="caption">Δ = 本视频 − 本批 baseline；蓝色动态程度需结合任务判断。未测不填零，NoRepeat 未测。</p></section>`;
}
function inputBody(j,c){
 const p=payload(c),messages=c.request?.messages||[],system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
 if(!p)return `<p class="caption">该请求没有可解析的结构化 user 消息，以下保留实际输入原文。</p>${rawDetail('完整实际请求',c.request)}`;
 const state=p.state||{},attention=state.attention,probes=p.probes||{},history=arr(p.history),context=p.input_context||{},cards=arr(context.paper_evidence),memory=p.completed_development_experience,records=arr(memory?.records),candidates=arr(probes.candidates);
 const hasPrompt=typeof p.task?.generation_prompt==='string';
 const promptAnywhere=!hasPrompt&&JSON.stringify(messages).includes(j.prompt);
 const task=hasPrompt?(p.task.generation_prompt===j.prompt?'已发送，与上方生成 prompt 一致。':'实际发送的任务 prompt：'+p.task.generation_prompt):promptAnywhere?'完整 prompt 出现在实际消息中；没有独立 task.generation_prompt 字段。':'这次实际请求未包含完整生成 prompt；上方文字是生成模型的输入。';
 const hidden=probes.status==='withheld_by_input_ablation';
 const sampling=attention?.sampling_summary;
 const stats=attention?['far_mass','normalized_entropy','attention_kl'].filter(k=>num(attention[k])).map(k=>`${k} = ${fmt(attention[k],6)}`).join(' · '):'';
 let samplingText=sampling?`采样层 ${arr(sampling.layers).join(' / ')}；head ${arr(sampling.heads).join(' / ')}；${sampling.row_count??'?'} 行，query/行 ${arr(sampling.sampled_queries_per_row).join(' / ')}。`:'';
 if(!sampling&&arr(attention?.layer_statistics).length){const rows=attention.layer_statistics;samplingText=`${rows.length} 行采样，层 ${[...new Set(rows.map(r=>r.layer))].join(' / ')}，head ${[...new Set(rows.map(r=>r.head))].join(' / ')}。`;}
 const attText=attention?`${esc(stats||'已发送观测字段')}<small>${esc(samplingText)} 局部采样，不是完整 Attention 或画质分数。</small>`:hidden||context.flags?.realtime===false?'本组输入消融隐藏了 Attention 和 latent 实时观测。':'请求中未提供 state.attention。';
 const probeText=hidden?`只发送合法候选 α：${candidates.map(v=>esc(v.alpha)).join(' / ')}；候选响应数值已隐藏。`:candidates.length?`<div class="probe-values">${candidates.map(v=>`<span>α <b>${esc(v.alpha)}</b>${num(v.far_mass)?' · far_mass '+fmt(v.far_mass,6):''}${num(v.attention_kl)?' · KL '+fmt(v.attention_kl,6):''}</span>`).join('')}</div>`:'未提供候选 Probe。';
 const paperText=cards.length?`${cards.length} 张论文证据卡：<span class="input-tags">${cards.map(card=>'<span title="'+esc(card.id)+'">'+esc(cardLabels[card.id]||card.id)+'</span>').join('')}</span>`:context.flags?.paper===false?'本组输入消融隐藏论文证据卡。':system?'没有独立 paper_evidence 卡片字段；system 原文另列，不把其中背景说明误标成“没有论文输入”。':'未提供论文证据卡或 system 背景。';
 const historyText=history.length?`${history.length} 条：${history.map(h=>'step '+esc(h.step)+' → α '+esc(h.decision?.selected_alpha??h.action?.selected_alpha??'未记录')).join('；')}。<small>所含观察、动作、预测以完整实际请求为准。</small>`:'0 条：本次未携带本视频先前决策记录。';
 const memoryText=memory?`${records.length} 条已完成视频经验；省略 ${esc(memory.omitted_records??'未记录')} 条。${records.length?'<small>包含此前任务、动作轨迹、观测、VBench分数与公开视觉反思摘要；不是原视频或隐藏会话。VideoScore未回灌。</small>':'当前没有先前完成视频。'}`:'未发送跨视频经验字段。';
 const currentVisual=p.task?.decoded_video_available===false?'未发送当前视频画面；跨视频的视觉反思摘要与当前画面输入不同。':messages.some(m=>Array.isArray(m.content)&&m.content.some(v=>v.type==='image_url'))?'消息包含图像输入，见完整请求。':'本次在线请求没有图像消息。';
 let memoryDetail='';
 if(records.length)memoryDetail=`<details class="input-detail"><summary>展开这 ${records.length} 条实际共享经验</summary>${records.map(r=>`<div class="memory-record"><strong>${esc(r.episode_id)}</strong><p>${esc(r.sample?.prompt??r.sample?.generation_prompt??'任务见下方原始记录')}</p>${pre(r)}</div>`).join('')}</details>`;
 const u=c.usage||{},d=c.decision||{};
 return `<div class="request-meta">实际响应 ${esc(c.model??'未记录')} · API ${num(c.apiSeconds)?c.apiSeconds.toFixed(2)+' 秒':'未记录'} · 输入 ${esc(u.prompt_tokens??u.input_tokens??'未知')} / 输出 ${esc(u.completion_tokens??u.output_tokens??'未知')} tokens</div><dl class="input-inventory">
 ${row('任务 prompt',esc(task),hasPrompt?'sent':'absent')}
 ${row('当前状态',`第 ${esc(state.step??c.step)} / ${esc(state.total_steps??j.totalSteps)} 步 · 当前 α ${esc(state.current_alpha??'未记录')} · scheduler timestep ${esc(state.scheduler_timestep??'未记录')} · 外推倍率 ${esc(state.extrapolation_ratio??'未记录')}${state.latent_summary?'<small>latent '+esc(JSON.stringify(state.latent_summary))+'</small>':''}`)}
 ${row('Attention 观测',attText,attention?'sent':'absent')}
 ${row('候选 Probe',probeText,hidden?'absent':'sent')}
 ${row('论文背景',paperText,cards.length?'sent':'absent')}
 ${row('视频内历史',historyText)}
 ${row('跨视频共享',memoryText,records.length?'sent':'absent')}
 ${row('当前视频画面',esc(currentVisual))}
 ${row('动作约束与策略',`α 范围 ${esc(p.constraints?.alpha_min??'未记录')}–${esc(p.constraints?.alpha_max??'未记录')}；${p.policy?.allow_unprobed===false?'只允许已探测候选':'权限见完整请求'}。<small>另含策略、预算、${p.research_protocol?'研究协议、':''}${p.temporal_observation_check?'前后观测核对、':''}状态限制；完整字段见下方。</small>`)}
 </dl>${memoryDetail}<details class="input-detail"><summary>system 提示词全文 · ${system.length.toLocaleString()} 字符</summary>${pre(system)}</details>${cards.length?rawDetail('论文证据卡的实际内容',cards):''}
 <details class="input-detail actual-request"><summary>完整实际 Agent input · system + user + API 参数</summary>${pre(c.request)}</details>
 <div class="inline-answer"><strong>这次输出：α = ${esc(d.selected_alpha??'未记录')}</strong><span> · ${num(c.effectiveFromStep)?'第 '+c.effectiveFromStep+' 步起生效':'生效步未记录'} · 置信度 ${esc(d.confidence??'未记录')}</span><details><summary>查看本次模型公开理由与预期效果</summary><h4>观察</h4><p>${esc(d.observed_issue??'未记录')}</p><h4>选择理由</h4><p>${esc(d.reasoning_summary??c.error??'未记录')}</p><h4>预期效果</h4><p>${esc(d.expected_effect??'未记录')}</p></details></div>`;
}
function input(j,slot){
 const calls=callsFor(j);
 if(!calls.length){
  const note=j.cohort==='freshprefix'?'这是固定候选尾部分支，没有该分支独立的在线 Agent 请求；沿用已保存的共同前缀。':j.arm==='C_replay'?'这是预设下降规则，没有向大模型发送在线决策请求。':'这是固定参数 baseline，没有向 Agent 发送在线决策请求。';
  return `<section class="side-block"><h3>实际给 Agent 的 input</h3><p class="no-agent">${note}</p><p class="caption">实际 α 轨迹：${esc((j.trace||[]).map(t=>'step '+(t.applies_from_step??t.step??'?')+'：'+t.alpha).join(' → '))}</p></section>`;
 }
 const id=`input-step-${slot}`,c=calls.at(-1);
 return `<section class="side-block inline-input" data-job="${esc(j.id)}"><div class="side-title"><h3>实际给 Agent 的 input</h3><label for="${id}">查看接入步骤<select id="${id}" class="input-step">${calls.map(v=>`<option value="${esc(v.id)}"${v.id===c.id?' selected':''}>第 ${esc(v.step)} 步 · α ${esc(v.decision?.selected_alpha??'未记录')}</option>`).join('')}</select></label></div><p class="caption">以下按这次已发送请求解析；切换步骤会更新输入、数值、历史和模型回答。</p><div class="input-body">${inputBody(j,c)}</div></section>`;
}
function render(j,slot){return `<aside class="video-details" aria-label="${esc(j.label)}的prompt、输入与指标"><section class="side-block generation-prompt"><div class="side-title"><h3>视频生成 prompt</h3><span class="badge">seed ${esc(j.seed)} · ${j.totalSteps} 步</span></div><p lang="en">${esc(j.prompt)}</p></section>${metrics(j)}<details class="full-input"><summary>实际 Agent input · 按步骤查看输入和输出原文</summary>${input(j,slot)}</details></aside>`;}
function bind(root){root.querySelectorAll('.input-step').forEach(select=>select.addEventListener('change',()=>{const panel=select.closest('.inline-input'),j=jobMap.get(panel.dataset.job),c=callsFor(j).find(c=>c.id===select.value);panel.querySelector('.input-body').innerHTML=inputBody(j,c);}));}
window.WAN_VIDEO_DETAILS={render,bind};
})();
