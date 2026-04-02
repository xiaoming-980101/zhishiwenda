<script setup lang="ts">
import type { PracticeQuestion, FillBlankSlot, ExamPaperConfig, ScenarioSubQuestion } from '@/data/exam'
import { practiceQuestions, defaultExamConfig, categoryTags } from '@/data/exam'

defineOptions({
  name: 'MockExam',
})

const router = useRouter()
const examConfig: ExamPaperConfig = defaultExamConfig

const mockExamStorage = useLocalStorage('cardwinner-mock-exam-state', {
  started: false,
  remainingSeconds: examConfig.durationMinutes * 60,
  objectiveAnswers: {} as Record<number, string | boolean | string[] | Record<number, any>>,
  submitted: false,
  autoSubmitted: false,
  optionOrder: {} as Record<number, string[]>,
})

const safeMockExamStorage = computed(() => ({
  ...mockExamStorage.value,
  started: Boolean(mockExamStorage.value.started),
  remainingSeconds: Number.isFinite(mockExamStorage.value.remainingSeconds) ? mockExamStorage.value.remainingSeconds : examConfig.durationMinutes * 60,
  objectiveAnswers: mockExamStorage.value.objectiveAnswers || {},
  submitted: Boolean(mockExamStorage.value.submitted),
  autoSubmitted: Boolean(mockExamStorage.value.autoSubmitted),
  optionOrder: mockExamStorage.value.optionOrder && typeof mockExamStorage.value.optionOrder === 'object' ? mockExamStorage.value.optionOrder : {},
}))

const durationMinutes = examConfig.durationMinutes
const totalExamScore = examConfig.totalScore
const passScore = examConfig.passScore

// 考试状态控制 - 从 localStorage 读取初始状态
const examStarted = ref(safeMockExamStorage.value.started)
const submitted = ref(safeMockExamStorage.value.submitted)
const autoSubmitted = ref(safeMockExamStorage.value.autoSubmitted)
const remainingSeconds = ref(safeMockExamStorage.value.remainingSeconds)
const objectiveAnswers = reactive<Record<number, string | boolean | string[] | Record<number, any>>>({ ...safeMockExamStorage.value.objectiveAnswers })
const optionOrder = ref<Record<number, string[]>>({ ...safeMockExamStorage.value.optionOrder })

function shuffleArray<T>(list: T[]) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 按配置组卷：根据题型和数量抽取题目 - 每次都是新题目
function buildExamPaperByConfig() {
  const allQuestionsByType: Record<string, PracticeQuestion[]> = {
    single: practiceQuestions.filter(q => q.type === 'single'),
    multiple: practiceQuestions.filter(q => q.type === 'multiple'),
    judge: practiceQuestions.filter(q => q.type === 'judge'),
    fillBlank: practiceQuestions.filter(q => q.type === 'fillBlank'),
    scenario: practiceQuestions.filter(q => q.type === 'scenario'),
  }

  const selectedQuestions: PracticeQuestion[] = []

  for (const section of examConfig.sections) {
    const pool = allQuestionsByType[section.type] || []
    const shuffled = shuffleArray(pool)
    const picked = shuffled.slice(0, Math.min(section.questionCount, shuffled.length))
    selectedQuestions.push(...picked)
  }

  return selectedQuestions // 不再打乱整体顺序，按题型顺序返回
}

// 考试题目 - 直接从组卷结果获取，不缓存题目ID
const objectiveQuestions = ref<PracticeQuestion[]>([])

// 初始化考试
function initExam() {
  // 如果已有进行中的考试且有题目，恢复状态
  if (examStarted.value && !submitted.value && objectiveQuestions.value.length > 0) {
    return
  }
  // 否则开始新考试
  const newPaper = buildExamPaperByConfig()
  objectiveQuestions.value = newPaper

  // 重置选项顺序
  optionOrder.value = Object.fromEntries(
    newPaper
      .filter(item => item.type === 'single' && item.options)
      .map(item => [item.id, shuffleArray(item.options!.map(option => option.label))]),
  )

  // 清空答案
  for (const key of Object.keys(objectiveAnswers))
    delete objectiveAnswers[Number(key)]

  // 重置状态
  submitted.value = false
  autoSubmitted.value = false
  remainingSeconds.value = durationMinutes * 60
  examStarted.value = true
  syncStorage()
}

// 获取题型标签
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fillBlank: '填空题',
    scenario: '场景题',
  }
  return labels[type] || type
}

// 多选题答案处理
function toggleMultipleAnswer(questionId: number, label: string) {
  if (submitted.value) return
  const current = objectiveAnswers[questionId] as string[] | undefined
  if (!current) {
    objectiveAnswers[questionId] = [label]
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        delete objectiveAnswers[questionId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
  syncStorage()
}

function isMultipleSelected(questionId: number, label: string): boolean {
  const current = objectiveAnswers[questionId] as string[] | undefined
  return current ? current.includes(label) : false
}

// 填空题答案处理
function setFillBlankAnswer(questionId: number, slotId: number, value: string) {
  if (submitted.value) return
  // 确保值是字符串类型
  const safeValue = String(value || '')
  const current = objectiveAnswers[questionId] as Record<number, string> | undefined
  if (!current) {
    objectiveAnswers[questionId] = { [slotId]: safeValue }
  } else {
    current[slotId] = safeValue
  }
  syncStorage()
}

function getFillBlankAnswer(questionId: number, slotId: number): string {
  const current = objectiveAnswers[questionId] as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

// 场景题子问题答案处理
function setScenarioAnswer(questionId: number, subId: number, value: string | boolean | string[] | Record<number, string>) {
  if (submitted.value) return
  const current = objectiveAnswers[questionId] as Record<number, any> | undefined
  if (!current) {
    objectiveAnswers[questionId] = { [subId]: value }
  } else {
    current[subId] = value
  }
  syncStorage()
}

function getScenarioAnswer(questionId: number, subId: number): string | boolean | string[] | Record<number, string> | undefined {
  const current = objectiveAnswers[questionId] as Record<number, any> | undefined
  return current ? current[subId] : undefined
}

function toggleScenarioMultipleAnswer(questionId: number, subId: number, label: string) {
  if (submitted.value) return
  const current = getScenarioAnswer(questionId, subId) as string[] | undefined
  if (!current) {
    setScenarioAnswer(questionId, subId, [label])
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        const parent = objectiveAnswers[questionId] as Record<number, any>
        delete parent[subId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
  syncStorage()
}

function isScenarioMultipleSelected(questionId: number, subId: number, label: string): boolean {
  const current = getScenarioAnswer(questionId, subId) as string[] | undefined
  return current ? current.includes(label) : false
}

function isScenarioMultipleCorrect(questionId: number, subQ: any): boolean {
  const userAnswer = getScenarioAnswer(questionId, subQ.subId) as string[] | undefined
  if (!userAnswer) return false
  const correctAnswer = subQ.answer as string[]
  return correctAnswer.length === userAnswer.length && correctAnswer.every(a => userAnswer.includes(a))
}

function setScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number, value: string) {
  if (submitted.value) return
  // 确保值是字符串类型
  const safeValue = String(value || '')
  const current = getScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  if (!current) {
    setScenarioAnswer(questionId, subId, { [slotId]: safeValue })
  } else {
    current[slotId] = safeValue
  }
  syncStorage()
}

function getScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number): string {
  const current = getScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

// 计时器
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    if (!examStarted.value || submitted.value) return
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1
      syncStorage()
      return
    }
    submitted.value = true
    autoSubmitted.value = true
    syncStorage()
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 监听答案变化，同步存储
watch(objectiveAnswers, () => {
  syncStorage()
}, { deep: true })

onMounted(() => {
  initExam()
  startTimer()
})

onBeforeUnmount(() => stopTimer())

// 判断单题是否正确
function isQuestionCorrect(question: PracticeQuestion): boolean {
  const userAnswer = objectiveAnswers[question.id]
  console.log(`[isQuestionCorrect] 题目ID: ${question.id}, 类型: ${question.type}`)
  console.log(`[isQuestionCorrect] 用户答案:`, userAnswer)
  console.log(`[isQuestionCorrect] 正确答案:`, question.answer)

  if (userAnswer === undefined) {
    console.log(`[isQuestionCorrect] 结果: false (未作答)`)
    return false
  }

  if (question.type === 'multiple') {
    const correctAnswer = question.answer as string[]
    const userAnswerArr = userAnswer as string[]
    const result = correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))
    console.log(`[isQuestionCorrect] 多选题结果: ${result}`)
    return result
  } else if (question.type === 'fillBlank') {
    const slots = question.fillSlots || []
    const userFillAnswer = userAnswer as Record<number, string>
    const result = slots.every(slot => {
      const userValue = userFillAnswer[slot.slotId] || ''
      // 双向匹配：用户答案包含关键词，或关键词包含用户答案
      return slot.keywords.some(keyword => {
        const kw = keyword.toLowerCase()
        const uv = userValue.toLowerCase()
        return uv.includes(kw) || kw.includes(uv)
      })
    })
    console.log(`[isQuestionCorrect] 填空题结果: ${result}`)
    return result
  } else if (question.type === 'scenario') {
    const subQs = question.subQuestions || []
    const userScenarioAnswer = userAnswer as Record<number, any>
    const result = subQs.every(subQ => {
      const subAnswer = userScenarioAnswer[subQ.subId]
      if (subAnswer === undefined) return false
      if (subQ.type === 'multiple') {
        const correctAnswer = subQ.answer as string[]
        const userAnswerArr = subAnswer as string[]
        return correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))
      } else if (subQ.type === 'fillBlank') {
        const slots = subQ.fillSlots || []
        const userFillAnswer = subAnswer as Record<number, string>
        return slots.every(slot => {
          const userValue = userFillAnswer[slot.slotId] || ''
          // 双向匹配：用户答案包含关键词，或关键词包含用户答案
          return slot.keywords.some(keyword => {
            const kw = keyword.toLowerCase()
            const uv = userValue.toLowerCase()
            return uv.includes(kw) || kw.includes(uv)
          })
        })
      } else {
        return subAnswer === subQ.answer
      }
    })
    console.log(`[isQuestionCorrect] 场景题结果: ${result}`)
    return result
  } else {
    const result = userAnswer === question.answer
    console.log(`[isQuestionCorrect] 单选/判断题结果: ${result}`)
    return result
  }
}

// 计算每道题的分数
function getQuestionScore(question: PracticeQuestion): number {
  const section = examConfig.sections.find(s => s.type === question.type)
  console.log(`[getQuestionScore] 题目ID: ${question.id}, 类型: ${question.type}`)
  console.log(`[getQuestionScore] section:`, section)

  if (!section) {
    console.log(`[getQuestionScore] 返回 0 (找不到section)`)
    return 0
  }

  // 填空题支持部分得分：每个空独立计分
  if (question.type === 'fillBlank') {
    const slots = question.fillSlots || []
    if (slots.length === 0) {
      console.log(`[getQuestionScore] 填空题返回 0 (没有空)`)
      return 0
    }
    const slotScore = section.scorePerQuestion / slots.length
    const userFillAnswer = objectiveAnswers[question.id] as Record<number, string> | undefined
    console.log(`[getQuestionScore] 填空题用户答案:`, userFillAnswer)
    let correctSlotCount = 0
    for (const slot of slots) {
      if (!userFillAnswer) continue
      const userValue = userFillAnswer[slot.slotId] || ''
      if (slot.keywords.some(keyword => userValue.includes(keyword))) {
        correctSlotCount += 1
      }
    }
    const earned = slotScore * correctSlotCount
    console.log(`[getQuestionScore] 填空题得分: ${earned} (正确${correctSlotCount}/${slots.length}空)`)
    return earned
  }

  const correct = isQuestionCorrect(question)
  console.log(`[getQuestionScore] 是否正确: ${correct}`)
  if (correct) {
    if (question.type === 'scenario') {
      // 场景题按子问题得分计算
      const subQs = question.subQuestions || []
      const userScenarioAnswer = objectiveAnswers[question.id] as Record<number, any> | undefined
      let earnedScore = 0
      for (const subQ of subQs) {
        if (!userScenarioAnswer) continue
        const subAnswer = userScenarioAnswer[subQ.subId]
        if (subAnswer === undefined) continue
        if (subQ.type === 'multiple') {
          const correctAnswer = subQ.answer as string[]
          const userAnswerArr = subAnswer as string[]
          if (correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))) {
            earnedScore += subQ.score
          }
        } else if (subQ.type === 'fillBlank') {
          const slots = subQ.fillSlots || []
          const userFillAnswer = subAnswer as Record<number, string>
          if (slots.every(slot => {
            const userValue = userFillAnswer[slot.slotId] || ''
            return slot.keywords.some(keyword => userValue.includes(keyword))
          })) {
            earnedScore += subQ.score
          }
        } else {
          if (subAnswer === subQ.answer) {
            earnedScore += subQ.score
          }
        }
      }
      console.log(`[getQuestionScore] 场景题得分: ${earnedScore}`)
      return earnedScore
    }
    console.log(`[getQuestionScore] 得分: ${section.scorePerQuestion}`)
    return section.scorePerQuestion
  }
  console.log(`[getQuestionScore] 得分: 0 (答错)`)
  return 0
}

// 获取场景题得分明细
function getScenarioScoreDetail(question: PracticeQuestion): { earned: number, total: number } {
  const subQs = question.subQuestions || []
  const userScenarioAnswer = objectiveAnswers[question.id] as Record<number, any> | undefined
  let earnedScore = 0
  const totalScore = subQs.reduce((sum, subQ) => sum + subQ.score, 0)
  for (const subQ of subQs) {
    if (!userScenarioAnswer) continue
    const subAnswer = userScenarioAnswer[subQ.subId]
    if (subAnswer === undefined) continue
    if (subQ.type === 'multiple') {
      const correctAnswer = subQ.answer as string[]
      const userAnswerArr = subAnswer as string[]
      if (correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))) {
        earnedScore += subQ.score
      }
    } else if (subQ.type === 'fillBlank') {
      const slots = subQ.fillSlots || []
      const userFillAnswer = subAnswer as Record<number, string>
      if (slots.every(slot => {
        const userValue = userFillAnswer[slot.slotId] || ''
        // 双向匹配：用户答案包含关键词，或关键词包含用户答案
        return slot.keywords.some(keyword => {
          const kw = keyword.toLowerCase()
          const uv = userValue.toLowerCase()
          return uv.includes(kw) || kw.includes(uv)
        })
      })) {
        earnedScore += subQ.score
      }
    } else {
      if (subAnswer === subQ.answer) {
        earnedScore += subQ.score
      }
    }
  }
  return { earned: earnedScore, total: totalScore }
}

// 检查填空槽是否正确
// 匹配规则：用户答案包含关键词，或关键词包含用户答案（双向匹配）
function checkFillBlankSlot(slot: FillBlankSlot, userValue: string): boolean {
  if (!userValue) return false
  return slot.keywords.some(keyword => {
    const kw = keyword.toLowerCase()
    const uv = userValue.toLowerCase()
    // 双向检查：用户答案包含关键词，或关键词包含用户答案
    return uv.includes(kw) || kw.includes(uv)
  })
}

// 获取填空题得分明细
function getFillBlankScoreDetail(question: PracticeQuestion): { earned: number, total: number, correctSlots: number, totalSlots: number } {
  const section = examConfig.sections.find(s => s.type === 'fillBlank')
  const slots = question.fillSlots || []
  const totalSlots = slots.length
  const totalScore = section ? section.scorePerQuestion : 0
  if (totalSlots === 0) return { earned: 0, total: totalScore, correctSlots: 0, totalSlots: 0 }
  const slotScore = totalScore / totalSlots
  const userFillAnswer = objectiveAnswers[question.id] as Record<number, string> | undefined
  let correctSlotCount = 0
  for (const slot of slots) {
    if (!userFillAnswer) continue
    const userValue = userFillAnswer[slot.slotId] || ''
    // 双向匹配：用户答案包含关键词，或关键词包含用户答案
    if (slot.keywords.some(keyword => {
      const kw = keyword.toLowerCase()
      const uv = userValue.toLowerCase()
      return uv.includes(kw) || kw.includes(uv)
    })) {
      correctSlotCount += 1
    }
  }
  return { earned: slotScore * correctSlotCount, total: totalScore, correctSlots: correctSlotCount, totalSlots }
}

const scoreBreakdown = computed(() => {
  let total = 0
  for (const question of objectiveQuestions.value) {
    total += getQuestionScore(question)
  }
  return { total }
})

const passStatus = computed(() => scoreBreakdown.value.total >= passScore)

const weakCategories = computed(() => {
  const wrongQuestions = objectiveQuestions.value.filter(item => !isQuestionCorrect(item))
  return [...new Set(wrongQuestions.map(item => item.category))].slice(0, 3)
})

const timeText = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60).toString().padStart(2, '0')
  const seconds = (remainingSeconds.value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
})

function answerObjective(question: PracticeQuestion, value: string | boolean) {
  if (submitted.value)
    return
  objectiveAnswers[question.id] = value
}

function getOrderedOptions(question: PracticeQuestion) {
  if (question.type !== 'single' || !question.options)
    return []
  const labels = optionOrder.value[question.id] || question.options.map(option => option.label)
  return labels
    .map(label => question.options?.find(option => option.label === label))
    .filter((item): item is NonNullable<PracticeQuestion['options']>[number] => Boolean(item))
}

// 同步存储
function syncStorage() {
  mockExamStorage.value = {
    started: examStarted.value,
    remainingSeconds: remainingSeconds.value,
    objectiveAnswers: { ...objectiveAnswers },
    submitted: submitted.value,
    autoSubmitted: autoSubmitted.value,
    optionOrder: { ...optionOrder.value },
  }
}

function submitPaper() {
  submitted.value = true
  autoSubmitted.value = false

  // 调试：打印所有答案和分数
  console.log('========== 交卷调试 ==========')
  console.log('所有题目:', objectiveQuestions.value)
  console.log('所有答案:', objectiveAnswers)
  console.log('题目数量:', objectiveQuestions.value.length)

  let totalScore = 0
  for (const question of objectiveQuestions.value) {
    const score = getQuestionScore(question)
    totalScore += score
    console.log(`题目 ${question.id} (${question.type}) 得分: ${score}`)
  }
  console.log('总分:', totalScore)
  console.log('==============================')

  syncStorage()
}

function resetPaper() {
  // 重新组卷
  const newPaper = buildExamPaperByConfig()
  objectiveQuestions.value = newPaper

  // 清空答案
  for (const key of Object.keys(objectiveAnswers))
    delete objectiveAnswers[Number(key)]

  // 重置状态
  submitted.value = false
  autoSubmitted.value = false
  remainingSeconds.value = durationMinutes * 60

  // 重置选项顺序
  optionOrder.value = Object.fromEntries(
    newPaper
      .filter(item => item.type === 'single' && item.options)
      .map(item => [item.id, shuffleArray(item.options!.map(option => option.label))]),
  )

  syncStorage()
}

function exitExam() {
  const confirmed = window.confirm('退出考试会清除当前作答记录，确定退出吗？')
  if (!confirmed)
    return
  // 清除考试状态
  examStarted.value = false
  submitted.value = false
  autoSubmitted.value = false
  stopTimer()
  syncStorage()
  router.push({ name: 'Home' })
}

// 题目总数
const OBJECTIVE_COUNT = computed(() => objectiveQuestions.value.length)
</script>

<template>
  <div class="px-[12px] pt-[12px] pb-[100px] space-y-[14px]">
    <section class="exam-banner rounded-[22px] p-[16px] text-white">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[12px] tracking-[2px] uppercase opacity-80">
            Mock Exam
          </div>
          <div class="text-[24px] font-bold mt-[8px]">
            模拟考试
          </div>
        </div>
        <div class="timer-pill">
          {{ timeText }}
        </div>
      </div>
      <p class="text-[14px] leading-[24px] mt-[10px] text-white/85">
        共 {{ OBJECTIVE_COUNT }} 道题，满分 {{ totalExamScore }} 分，及格线 {{ passScore }} 分。建议先快速完成，注意时间控制。
      </p>
      <div class="mt-[12px]">
        <van-button size="small" round plain @click="exitExam">
          退出考试
        </van-button>
      </div>
    </section>

    <section
      v-if="submitted"
      class="rounded-[20px] p-[16px]"
      :class="passStatus ? 'score-pass' : 'score-warn'"
    >
      <div class="text-[14px] opacity-80">
        模拟成绩
      </div>
      <div class="text-[36px] font-bold mt-[6px]">
        {{ scoreBreakdown.total }} 分
      </div>
      <div class="text-[14px] leading-[24px] mt-[12px]">
        {{ autoSubmitted ? '倒计时结束，系统已自动交卷并锁定答案。' : passStatus ? `已达到及格线 ${passScore} 分，继续保持！` : `还没到 ${passScore} 分，建议重点复习薄弱知识点。` }}
      </div>
      <div v-if="weakCategories.length" class="mt-[12px]">
        <div class="text-[14px] font-bold">薄弱知识点：</div>
        <div class="flex flex-wrap gap-[8px] mt-[8px]">
          <van-tag
            v-for="item in weakCategories"
            :key="item"
            type="danger"
            round
          >
            {{ item }}
          </van-tag>
        </div>
      </div>
      <div class="mt-[12px]">
        <van-button round type="primary" @click="resetPaper">
          重新模考
        </van-button>
      </div>
    </section>

    <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
      <div class="section-title">
        考试题目
      </div>
      <div class="sub-title">
        共 {{ objectiveQuestions.length }} 题，包含单选题、多选题、判断题、填空题和场景题。
      </div>
    </section>

    <section
      v-for="(question, index) in objectiveQuestions"
      :key="`o-${question.id}`"
      class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card"
    >
      <div class="flex items-center justify-between text-[13px] text-[var(--van-text-color-2)]">
        <span>第 {{ index + 1 }} 题</span>
        <span class="type-tag">{{ getTypeLabel(question.type) }}</span>
      </div>

      <!-- 场景题描述 -->
      <div v-if="question.type === 'scenario' && question.scenarioDesc" class="scenario-desc-box mt-[12px]">
        <div class="font-bold text-[var(--color-brand-deep)]">
          场景描述
        </div>
        <div class="mt-[8px] text-[15px] leading-[24px]">
          {{ question.scenarioDesc }}
        </div>
      </div>

      <div class="text-[18px] leading-[28px] font-bold mt-[10px] text-[var(--color-brand-deep)]">
        {{ question.stem }}
      </div>

      <!-- 单选题 -->
      <div v-if="question.type === 'single'" class="mt-[14px] space-y-[10px]">
        <button
          v-for="option in getOrderedOptions(question)"
          :key="option.label"
          type="button"
          class="answer-card"
          :class="{
            selected: objectiveAnswers[question.id] === option.label,
            correct: submitted && question.answer === option.label,
            incorrect: submitted && objectiveAnswers[question.id] === option.label && objectiveAnswers[question.id] !== question.answer,
          }"
          :disabled="submitted"
          @click="answerObjective(question, option.label)"
        >
          <span class="answer-label">{{ option.label }}</span>
          <span>{{ option.text }}</span>
        </button>
      </div>

      <!-- 多选题 -->
      <div v-else-if="question.type === 'multiple'" class="mt-[14px] space-y-[10px]">
        <button
          v-for="option in question.options"
          :key="option.label"
          type="button"
          class="answer-card"
          :class="{
            selected: isMultipleSelected(question.id, option.label),
            correct: submitted && (question.answer as string[]).includes(option.label),
            incorrect: submitted && isMultipleSelected(question.id, option.label) && !(question.answer as string[]).includes(option.label),
          }"
          :disabled="submitted"
          @click="toggleMultipleAnswer(question.id, option.label)"
        >
          <span class="answer-label">{{ option.label }}</span>
          <span>{{ option.text }}</span>
        </button>
        <div v-if="!submitted" class="mt-[8px] text-[12px] text-[var(--van-text-color-2)]">
          多选题：可选择多个答案，点击已选项可取消
        </div>
      </div>

      <!-- 判断题 -->
      <div v-else-if="question.type === 'judge'" class="mt-[14px] space-y-[10px]">
        <button
          type="button"
          class="answer-card"
          :class="{
            selected: objectiveAnswers[question.id] === true,
            correct: submitted && question.answer === true,
            incorrect: submitted && objectiveAnswers[question.id] === true && objectiveAnswers[question.id] !== question.answer,
          }"
          :disabled="submitted"
          @click="answerObjective(question, true)"
        >
          <span class="answer-label">A</span>
          <span>正确</span>
        </button>
        <button
          type="button"
          class="answer-card"
          :class="{
            selected: objectiveAnswers[question.id] === false,
            correct: submitted && question.answer === false,
            incorrect: submitted && objectiveAnswers[question.id] === false && objectiveAnswers[question.id] !== question.answer,
          }"
          :disabled="submitted"
          @click="answerObjective(question, false)"
        >
          <span class="answer-label">B</span>
          <span>错误</span>
        </button>
      </div>

      <!-- 填空题 -->
      <div v-else-if="question.type === 'fillBlank'" class="mt-[14px] space-y-[12px]">
        <div
          v-for="slot in question.fillSlots"
          :key="slot.slotId"
          class="fill-blank-item"
        >
          <div class="text-[14px] font-bold text-[var(--color-brand-deep)] mb-[6px]">
            第 {{ slot.slotId }} 空
          </div>
          <van-field
            :model-value="getFillBlankAnswer(question.id, slot.slotId)"
            :placeholder="slot.placeholder"
            :disabled="submitted"
            clearable
            @update:model-value="(val: string) => setFillBlankAnswer(question.id, slot.slotId, val)"
          />
        </div>
        <div v-if="!submitted" class="mt-[8px] text-[12px] text-[var(--van-text-color-2)]">
          填空题：答案包含关键词即可得分
        </div>
      </div>

      <!-- 场景题子问题 -->
      <div v-else-if="question.type === 'scenario'" class="mt-[14px] space-y-[16px]">
        <div
          v-for="subQ in question.subQuestions"
          :key="subQ.subId"
          class="sub-question-box"
        >
          <div class="flex items-center justify-between mb-[8px]">
            <div class="text-[14px] font-bold text-[var(--color-brand-deep)]">
              问题 {{ subQ.subId }}（{{ subQ.type === 'judge' ? '判断' : subQ.type === 'multiple' ? '多选' : subQ.type === 'single' ? '单选' : '填空' }}）
            </div>
            <span class="sub-score-tag">{{ subQ.score }} 分</span>
          </div>
          <div class="text-[16px] leading-[24px]">
            {{ subQ.stem }}
          </div>

          <!-- 场景题-判断子题 -->
          <div v-if="subQ.type === 'judge'" class="mt-[10px] space-y-[8px]">
            <button
              type="button"
              class="answer-card small"
              :class="{ selected: getScenarioAnswer(question.id, subQ.subId) === true }"
              :disabled="submitted"
              @click="setScenarioAnswer(question.id, subQ.subId, true)"
            >
              <span class="answer-label small">A</span>
              <span class="flex-1 text-left">正确</span>
            </button>
            <button
              type="button"
              class="answer-card small"
              :class="{ selected: getScenarioAnswer(question.id, subQ.subId) === false }"
              :disabled="submitted"
              @click="setScenarioAnswer(question.id, subQ.subId, false)"
            >
              <span class="answer-label small">B</span>
              <span class="flex-1 text-left">错误</span>
            </button>
          </div>

          <!-- 场景题-单选子题 -->
          <div v-else-if="subQ.type === 'single'" class="mt-[10px] space-y-[8px]">
            <button
              v-for="option in subQ.options"
              :key="option.label"
              type="button"
              class="answer-card small"
              :class="{ selected: getScenarioAnswer(question.id, subQ.subId) === option.label }"
              :disabled="submitted"
              @click="setScenarioAnswer(question.id, subQ.subId, option.label)"
            >
              <span class="answer-label small">{{ option.label }}</span>
              <span class="flex-1 text-left">{{ option.text }}</span>
            </button>
          </div>

          <!-- 场景题-多选子题 -->
          <div v-else-if="subQ.type === 'multiple'" class="mt-[10px] space-y-[8px]">
            <button
              v-for="option in subQ.options"
              :key="option.label"
              type="button"
              class="answer-card small"
              :class="{ selected: isScenarioMultipleSelected(question.id, subQ.subId, option.label) }"
              :disabled="submitted"
              @click="toggleScenarioMultipleAnswer(question.id, subQ.subId, option.label)"
            >
              <span class="answer-label small">{{ option.label }}</span>
              <span class="flex-1 text-left">{{ option.text }}</span>
            </button>
          </div>

          <!-- 场景题-填空子题 -->
          <div v-else-if="subQ.type === 'fillBlank'" class="mt-[10px] space-y-[8px]">
            <div
              v-for="slot in subQ.fillSlots"
              :key="slot.slotId"
            >
              <div class="text-[12px] text-[var(--van-text-color-2)] mb-[4px]">
                第 {{ slot.slotId }} 空
              </div>
              <van-field
                :model-value="getScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId)"
                :placeholder="slot.placeholder"
                :disabled="submitted"
                clearable
                @update:model-value="(val: string) => setScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId, val)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 答案解析 -->
      <div
        v-if="submitted"
        class="mt-[12px] rounded-[14px] px-[12px] py-[10px] text-[14px] leading-[24px]"
        :class="isQuestionCorrect(question) ? 'analysis-ok' : 'analysis-bad'"
      >
        <!-- 单选/判断题答案 -->
        <div v-if="question.type === 'single' || question.type === 'judge'">
          <div class="text-[14px]">
            <span class="text-[var(--van-text-color-2)]">正确答案：</span>
            <span class="font-bold">{{ question.answer === true ? '正确' : question.answer === false ? '错误' : question.answer }}</span>
          </div>
          <div class="text-[14px] mt-[4px]">
            <span class="text-[var(--van-text-color-2)]">你的答案：</span>
            <span :class="objectiveAnswers[question.id] === question.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
              {{ objectiveAnswers[question.id] === true ? '正确' : objectiveAnswers[question.id] === false ? '错误' : objectiveAnswers[question.id] || '未作答' }}
            </span>
            <span :class="objectiveAnswers[question.id] === question.answer ? 'text-green-600' : 'text-red-500'">
              {{ objectiveAnswers[question.id] === question.answer ? ' ✓' : ' ✗' }}
            </span>
          </div>
        </div>

        <!-- 多选题答案 -->
        <div v-else-if="question.type === 'multiple'">
          <div class="text-[14px]">
            <span class="text-[var(--van-text-color-2)]">正确答案：</span>
            <span class="font-bold">{{ (question.answer as string[]).join('、') }}</span>
          </div>
          <div class="text-[14px] mt-[4px]">
            <span class="text-[var(--van-text-color-2)]">你的答案：</span>
            <span :class="(question.answer as string[]).length === (objectiveAnswers[question.id] as string[])?.length && (question.answer as string[]).every(a => (objectiveAnswers[question.id] as string[])?.includes(a)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
              {{ (objectiveAnswers[question.id] as string[])?.join('、') || '未作答' }}
            </span>
            <span :class="(question.answer as string[]).length === (objectiveAnswers[question.id] as string[])?.length && (question.answer as string[]).every(a => (objectiveAnswers[question.id] as string[])?.includes(a)) ? 'text-green-600' : 'text-red-500'">
              {{ (question.answer as string[]).length === (objectiveAnswers[question.id] as string[])?.length && (question.answer as string[]).every(a => (objectiveAnswers[question.id] as string[])?.includes(a)) ? ' ✓' : ' ✗' }}
            </span>
          </div>
        </div>

        <!-- 填空题答案 -->
        <div v-else-if="question.type === 'fillBlank'" class="space-y-[8px]">
          <div class="font-bold">
            填空题答案：
          </div>
          <div
            v-for="slot in question.fillSlots"
            :key="slot.slotId"
            class="fill-answer-row"
          >
            <div class="text-[14px]">
              <span class="text-[var(--van-text-color-2)]">第 {{ slot.slotId }} 空关键词：</span>
              <span class="font-bold">{{ slot.keywords.join(' / ') }}</span>
            </div>
            <div class="text-[14px] mt-[2px]">
              <span class="text-[var(--van-text-color-2)]">你的答案：</span>
              <span :class="checkFillBlankSlot(slot, getFillBlankAnswer(question.id, slot.slotId)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                {{ getFillBlankAnswer(question.id, slot.slotId) || '未填写' }}
              </span>
              <span :class="checkFillBlankSlot(slot, getFillBlankAnswer(question.id, slot.slotId)) ? 'text-green-600' : 'text-red-500'">
                {{ checkFillBlankSlot(slot, getFillBlankAnswer(question.id, slot.slotId)) ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 场景题答案 -->
        <div v-else-if="question.type === 'scenario'">
          <div class="font-bold">
            子问题答案：
          </div>
          <div class="mt-[8px] space-y-[12px]">
            <div
              v-for="subQ in question.subQuestions"
              :key="subQ.subId"
              class="sub-answer-box"
            >
              <div class="text-[14px] font-bold text-[var(--color-brand-deep)]">
                问题 {{ subQ.subId }}（{{ subQ.type === 'judge' ? '判断' : subQ.type === 'multiple' ? '多选' : subQ.type === 'single' ? '单选' : '填空' }}）
              </div>
              <div v-if="subQ.type === 'single'" class="mt-[6px]">
                <div class="text-[14px]">
                  <span class="text-[var(--van-text-color-2)]">正确答案：</span>
                  <span class="font-bold">{{ subQ.answer === 'A' ? 'A（对的）' : subQ.answer === 'B' ? 'B（错误）' : subQ.answer }}</span>
                </div>
                <div class="text-[14px] mt-[4px]">
                  <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                  <span :class="getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                    {{ getScenarioAnswer(question.id, subQ.subId) || '未作答' }}
                  </span>
                  <span :class="getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? 'text-green-600' : 'text-red-500'">
                    {{ getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? ' ✓' : ' ✗' }}
                  </span>
                </div>
              </div>
              <div v-else-if="subQ.type === 'judge'" class="mt-[6px]">
                <div class="text-[14px]">
                  <span class="text-[var(--van-text-color-2)]">正确答案：</span>
                  <span class="font-bold">{{ subQ.answer === true ? '正确' : '错误' }}</span>
                </div>
                <div class="text-[14px] mt-[4px]">
                  <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                  <span :class="getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                    {{ getScenarioAnswer(question.id, subQ.subId) === true ? '正确' : getScenarioAnswer(question.id, subQ.subId) === false ? '错误' : '未作答' }}
                  </span>
                  <span :class="getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? 'text-green-600' : 'text-red-500'">
                    {{ getScenarioAnswer(question.id, subQ.subId) === subQ.answer ? ' ✓' : ' ✗' }}
                  </span>
                </div>
              </div>
              <div v-else-if="subQ.type === 'multiple'" class="mt-[6px]">
                <div class="text-[14px]">
                  <span class="text-[var(--van-text-color-2)]">正确答案：</span>
                  <span class="font-bold">{{ (subQ.answer as string[]).join('、') }}</span>
                </div>
                <div class="text-[14px] mt-[4px]">
                  <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                  <span :class="isScenarioMultipleCorrect(question.id, subQ) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                    {{ (getScenarioAnswer(question.id, subQ.subId) as string[])?.join('、') || '未作答' }}
                  </span>
                  <span :class="isScenarioMultipleCorrect(question.id, subQ) ? 'text-green-600' : 'text-red-500'">
                    {{ isScenarioMultipleCorrect(question.id, subQ) ? ' ✓' : ' ✗' }}
                  </span>
                </div>
              </div>
              <div v-else-if="subQ.type === 'fillBlank'" class="mt-[6px] space-y-[6px]">
                <div
                  v-for="slot in subQ.fillSlots"
                  :key="slot.slotId"
                  class="fill-answer-row"
                >
                  <div class="text-[14px]">
                    <span class="text-[var(--van-text-color-2)]">第 {{ slot.slotId }} 空关键词：</span>
                    <span class="font-bold">{{ slot.keywords.join(' / ') }}</span>
                  </div>
                  <div class="text-[14px] mt-[2px]">
                    <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                    <span :class="checkFillBlankSlot(slot, getScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ getScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId) || '未填写' }}
                    </span>
                    <span :class="checkFillBlankSlot(slot, getScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId)) ? 'text-green-600' : 'text-red-500'">
                      {{ checkFillBlankSlot(slot, getScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId)) ? ' ✓' : ' ✗' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-[8px]">
          {{ question.explanation }}
        </div>
        <div class="proof-box">
          <div class="font-bold">
            原句依据
          </div>
          <div class="mt-[4px]">
            {{ question.proof }}
          </div>
        </div>
      </div>
    </section>

    <div class="fixed-action">
      <van-button
        block
        round
        type="primary"
        :disabled="submitted"
        @click="submitPaper"
      >
        {{ submitted ? '已交卷' : '立即交卷' }}
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="less">
.exam-banner {
  background:
    radial-gradient(circle at right top, rgba(254, 240, 138, 0.36), transparent 26%),
    linear-gradient(135deg, #3f3f46, #18181b 52%, #0f172a);
}

.timer-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 18px;
  font-weight: 700;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.sub-title {
  margin-top: 6px;
  font-size: 14px;
  line-height: 24px;
  color: var(--van-text-color-2);
}

.shadow-card {
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.type-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--color-tag-bg);
  color: var(--color-tag-text);
  font-size: 12px;
  font-weight: 700;
}

.answer-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background: var(--color-block-background);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.answer-card::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: var(--color-brand);
  opacity: 0.1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s ease, height 0.4s ease;
}

.answer-card:active::before {
  width: 300%;
  height: 300%;
}

.answer-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.answer-card:active {
  transform: scale(0.98);
}

.answer-card.selected {
  border-color: var(--color-brand);
  background: var(--color-success-bg);
  animation: selectPulse 0.3s ease;
}

@keyframes selectPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.answer-card.correct {
  border-color: var(--color-success);
  background: var(--color-success-bg);
}

.answer-card.incorrect {
  border-color: var(--color-error);
  background: var(--color-error-bg);
}

.answer-card:disabled {
  opacity: 1;
}

.answer-label {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  font-weight: 700;
  flex-shrink: 0;
}

.score-pass {
  background: var(--color-success-bg);
  color: var(--color-answer-correct);
}

.score-warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.analysis-ok {
  background: var(--color-success-bg);
  color: var(--color-answer-correct);
}

.analysis-bad {
  background: var(--color-error-bg);
  color: var(--color-answer-wrong);
}

.proof-box {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.fixed-action {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 64px;
}

// 场景题描述框
.scenario-desc-box {
  background: var(--color-scenario-bg);
  padding: 14px;
  border-radius: 18px;
}

// 填空题样式
.fill-blank-item {
  background: var(--color-sub-question-bg);
  padding: 12px;
  border-radius: 14px;
}

// 场景题子问题样式
.sub-question-box {
  background: var(--color-sub-question-bg);
  padding: 14px;
  border-radius: 18px;
}

// 子问题答案框样式
.sub-answer-box {
  background: var(--color-soft-card);
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
}

.sub-score-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--color-tag-bg);
  color: var(--color-tag-text);
  font-size: 11px;
  font-weight: 700;
}

// 小型答案卡片（用于场景题子问题）
.answer-card.small {
  padding: 10px;
  font-size: 14px;
  border-radius: 14px;
}

.answer-label.small {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

// 填空题答案行样式
.fill-answer-row {
  padding: 8px;
  background: var(--color-block-background);
  border-radius: 10px;
}
</style>