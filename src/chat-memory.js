'use strict';
// Campaign-owned data only. Provider settings, tokens and endpoints never enter saves.
const RoadState = require('./road-state');
const MAX_INSTRUCTIONS = 2000;
const MAX_MESSAGE = 1600;
function text(value, limit) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
function ensure(state, force = false) {
  if (!force && state.chat?.version === 1) return state.chat;
  const old = state.chat && typeof state.chat === 'object' ? state.chat : {};
  const history = Array.isArray(old.history) ? old.history : [];
  state.chat = {
    version: 1,
    road: RoadState.normalize(old.road),
    instructions: text(old.instructions, MAX_INSTRUCTIONS),
    history: history.slice(-40).filter(x => x && ['player','guide','rules'].includes(x.role))
      .map(x => ({ role:x.role, text:text(x.text, MAX_MESSAGE), turn:Number(x.turn)||0 })),
    pending: old.pending && typeof old.pending.optionId === 'string' && Number.isInteger(old.pending.turn)
      ? { optionId:text(old.pending.optionId,120), turn:old.pending.turn, sceneId:text(old.pending.sceneId,120),
          label:text(old.pending.label,500), input:text(old.pending.input,MAX_MESSAGE) } : null,
    courier: old.courier && typeof old.courier === 'object' ? {
      active:Boolean(old.courier.active), resolved:Boolean(old.courier.resolved),
      clue:Boolean(old.courier.clue), rapport:Boolean(old.courier.rapport), distraction:Boolean(old.courier.distraction),
      setbacks:Math.max(0,Math.min(10,Math.floor(Number(old.courier.setbacks)||0))),
      attempted:Array.isArray(old.courier.attempted) ? [...new Set(old.courier.attempted.filter(x => typeof x === 'string'))].slice(0,12) : [],
      facts:Array.isArray(old.courier.facts) ? old.courier.facts.filter(x=>typeof x==='string').slice(-12).map(x=>x.slice(0,400)) : []
    } : null
  };
  return state.chat;
}
function append(state, role, value) {
  const c=ensure(state); c.history.push({role,text:text(value,MAX_MESSAGE),turn:state.turnCount});
  c.history=c.history.slice(-40);
}
function instructions(state, value) {
  if (typeof value !== 'string' || value.length > MAX_INSTRUCTIONS) return {ok:false,error:`Campaign instructions must be text of at most ${MAX_INSTRUCTIONS} characters. Nothing was changed.`};
  const c=ensure(state); c.instructions=value.trim(); c.pending=null;
  const answer=c.instructions ? 'Campaign preferences saved. They guide future AI replies, not dice, XP, inventory, or automatic victories.' : 'Campaign preferences cleared.';
  append(state,'rules',answer); return {ok:true,kind:'chat',outcomeText:answer};
}
function view(state) {
  const c=ensure(state);
  return { instructions:c.instructions, history:c.history, pending:c.pending,
    courier:c.courier, instructionLimit:MAX_INSTRUCTIONS };
}
module.exports={ensure,append,instructions,view,MAX_INSTRUCTIONS,MAX_MESSAGE};
