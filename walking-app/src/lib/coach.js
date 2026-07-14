/* Coach insight engine.
   In production this is backed by Claude (claude-sonnet-5) with the
   user's step history + goals as context. In this prototype we run a
   deterministic rule engine that mirrors the same coaching structure,
   so the UX is fully testable offline. */

export function buildInsights(state) {
  const { stepsToday, profile, history, streak } = state
  const goal = profile.dailyGoal
  const hour = new Date().getHours()
  const vals = Object.values(history)
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  const pct = goal ? stepsToday / goal : 0
  const out = []

  // 0) relapse-aware welcome-back (self-compassion, not shame).
  // If the last goal-met day was several days ago, greet the return warmly.
  let gap = 0
  for (let i = 1; i <= 14; i++) {
    const d = new Date(state.today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if ((history[key] || 0) >= goal) break
    gap = i
  }
  if (gap >= 3 && stepsToday < goal) {
    out.push({
      tone: 'welcome',
      title: '다시 와줘서 반가워요 👋',
      body: `며칠 쉬었어도 괜찮아요. 습관은 한 번 놓쳤다고 무너지지 않아요(연구로 확인된 사실). 오늘은 가볍게 ${Math.round(goal * 0.4).toLocaleString()}보부터 다시 시작해요.`,
    })
  }

  // 1) time-aware nudge
  if (pct < 1) {
    const remaining = goal - stepsToday
    if (hour < 11) {
      out.push({
        tone: 'plan',
        title: '오늘의 플랜',
        body: `아침이에요. 점심 전 15분 산책이면 약 ${Math.min(remaining, 1800).toLocaleString()}보를 미리 채울 수 있어요.`,
      })
    } else if (hour < 18) {
      out.push({
        tone: 'plan',
        title: '지금이 기회',
        body: `목표까지 ${remaining.toLocaleString()}보. 한 정거장 먼저 내려 걸으면 딱 맞아요.`,
      })
    } else {
      out.push({
        tone: 'push',
        title: '마지막 스퍼트',
        body: `저녁 산책 ${Math.ceil(remaining / 110)}분이면 오늘 목표 달성! 스트릭을 지켜요.`,
      })
    }
  } else {
    out.push({
      tone: 'win',
      title: '오늘 목표 달성 🎉',
      body: `${stepsToday.toLocaleString()}보! 여기서 멈춰도 좋고, 내일을 위해 가볍게 정리 산책도 추천해요.`,
    })
  }

  // 2) trend insight
  if (avg > 0) {
    if (stepsToday >= avg) {
      out.push({
        tone: 'trend',
        title: '평소보다 활발해요',
        body: `최근 평균 ${avg.toLocaleString()}보보다 오늘 더 걷고 있어요. 이 리듬이 습관을 만듭니다.`,
      })
    } else {
      out.push({
        tone: 'trend',
        title: '조금 느린 하루',
        body: `평균 ${avg.toLocaleString()}보 대비 여유가 있어요. 무리하지 말고 짧게 자주 움직여봐요.`,
      })
    }
  }

  // 3) activity-snack tip around meal times (evidence-based, non-medical)
  if ((hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 20)) {
    out.push({
      tone: 'snack',
      title: '식후 10~15분 걷기',
      body: '식사 직후 짧게 걷는 게 하루 한 번 몰아 걷기보다 식후 혈당 관리에 더 도움이 돼요. 지금 딱 좋은 타이밍!',
    })
  }

  // 4) consistency coaching (flexible, self-compassionate)
  out.push({
    tone: 'consistency',
    title: '완벽보다 꾸준함',
    body: '매일 채우지 않아도 괜찮아요. 주 3~4일만 목표를 지켜도 건강 이득 대부분을 얻어요. 오늘 쉬어도 내일 다시 시작하면 돼요.',
  })

  return out
}

export function coachReply(question, state) {
  const q = question.toLowerCase()
  const goal = state.profile.dailyGoal
  if (q.includes('무릎') || q.includes('아파') || q.includes('통증')) {
    return '통증이 있으면 무리는 금물이에요. 오늘은 평지에서 천천히, 15분 이내로만 걷고 목표를 60%로 낮춰 드릴게요. 통증이 지속되면 전문가 상담을 권합니다.'
  }
  if (q.includes('혈당') || q.includes('식후') || q.includes('당뇨')) {
    return '식사 직후 10~15분 가볍게 걸어보세요. 한 연구에서 식후 15분씩 세 번 걷기가 하루 한 번 몰아 걷기보다 식후 혈당을 더 잘 낮췄어요. 특히 저녁 식후가 효과적입니다. (일반적 참고용이며 의학적 조언은 아니에요.)'
  }
  if (q.includes('살') || q.includes('체중') || q.includes('다이어트')) {
    return `체중 관리에는 "매일 조금씩"이 핵심이에요. 현재 목표 ${goal.toLocaleString()}보를 유지하며 식후 10분 산책을 더하면 혈당·체지방 관리에 효과적입니다.`
  }
  if (q.includes('동기') || q.includes('귀찮') || q.includes('의욕')) {
    return '의욕이 없을 땐 목표를 낮추세요. "신발 신고 문 앞까지"만 해도 성공이에요. 걷기 메이트에게 응원을 보내면 나도 자극받아요. 챌린지에 씨앗을 걸면 완주율이 크게 올라갑니다.'
  }
  if (q.includes('언제') || q.includes('시간')) {
    return '식후 30분 이내 산책이 혈당 스파이크를 낮춰 가장 효율적이에요. 아침 햇빛 산책은 수면과 기분에도 좋습니다.'
  }
  return `좋은 질문이에요. 지금 ${state.stepsToday.toLocaleString()}보 걸었고 목표는 ${goal.toLocaleString()}보예요. 오늘 컨디션에 맞춰 무리 없이 이어가 봐요. 더 구체적으로 도와드릴까요?`
}
