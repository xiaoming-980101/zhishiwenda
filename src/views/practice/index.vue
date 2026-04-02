<script setup lang="ts">
import type { PracticeQuestion, QuestionOption, QuestionType, FillBlankSlot, ExamPaperConfig, ScenarioSubQuestion } from '@/data/exam'
import { practiceQuestions, defaultExamConfig } from '@/data/exam'

defineOptions({
  name: 'Practice',
})

type PageMode = 'practice' | 'exam'

const route = useRoute()
const router = useRouter()

// 题目区域引用，用于自动滚动
const practiceQuestionRef = ref<HTMLElement | null>(null)
const examQuestionRef = ref<HTMLElement | null>(null)

// 使用统一的考试配置
const examConfig: ExamPaperConfig = defaultExamConfig
const durationMinutes = examConfig.durationMinutes

const pageMode = ref<PageMode>(route.query.mode === 'exam' ? 'exam' : 'practice')
const allowExamLeave = ref(false)

const practiceStorage = useLocalStorage('cardwinner-practice-state', {
  category: '全部',
  currentIndex: 0,
  userAnswers: {} as Record<number, string | boolean | string[] | string[][] | Record<number, any>>,
  objectiveCompleted: {} as Record<number, boolean>,
  objectiveOrder: [] as number[],
  selectedTypes: [] as QuestionType[],
})

const selectedCategory = ref(practiceStorage.value.category || '全部')
const objectiveIndex = ref(practiceStorage.value.currentIndex || 0)
const userAnswers = reactive<Record<number, string | boolean | string[] | string[][] | Record<number, any>>>({ ...(practiceStorage.value.userAnswers || {}) })
const practiceObjectiveCompleted = reactive<Record<number, boolean>>({ ...(practiceStorage.value.objectiveCompleted || {}) })
const selectedTypes = ref<QuestionType[]>([])
const showFilterPopup = ref(false)

const filterSummary = computed(() => {
  if (selectedTypes.value.length > 0 && selectedTypes.value.length < 4) {
    return `已选：${selectedTypes.value.length}种题型`
  }
  return '全部题型'
})

const mockExamStorage = useLocalStorage('cardwinner-mock-exam-state', {
  started: false,
  currentIndex: 0,
  unlockedIndex: 0,
  remainingSeconds: durationMinutes * 60,
  showCard: true,
  objectiveAnswers: {} as Record<number, string | boolean | string[] | Record<number, any>>,
  submitted: false,
  autoSubmitted: false,
  objectiveIds: [] as number[],
  objectiveOrder: [] as number[],
  optionOrder: {} as Record<number, string[]>,
})

const safeMockExamStorage = computed(() => ({
  ...mockExamStorage.value,
  started: Boolean(mockExamStorage.value.started),
  currentIndex: Number.isFinite(mockExamStorage.value.currentIndex) ? mockExamStorage.value.currentIndex : 0,
  unlockedIndex: Number.isFinite(mockExamStorage.value.unlockedIndex) ? mockExamStorage.value.unlockedIndex : 0,
  remainingSeconds: Number.isFinite(mockExamStorage.value.remainingSeconds) ? mockExamStorage.value.remainingSeconds : durationMinutes * 60,
  showCard: mockExamStorage.value.showCard ?? true,
  objectiveAnswers: mockExamStorage.value.objectiveAnswers || {},
  submitted: Boolean(mockExamStorage.value.submitted),
  autoSubmitted: Boolean(mockExamStorage.value.autoSubmitted),
  objectiveIds: Array.isArray(mockExamStorage.value.objectiveIds) ? mockExamStorage.value.objectiveIds : [],
  objectiveOrder: Array.isArray(mockExamStorage.value.objectiveOrder) ? mockExamStorage.value.objectiveOrder : [],
  optionOrder: mockExamStorage.value.optionOrder && typeof mockExamStorage.value.optionOrder === 'object' ? mockExamStorage.value.optionOrder : {},
}))

const examStarted = ref(safeMockExamStorage.value.started)
const examCurrentIndex = ref(safeMockExamStorage.value.currentIndex)
const examUnlockedIndex = ref(safeMockExamStorage.value.unlockedIndex)
const examRemainingSeconds = ref(safeMockExamStorage.value.remainingSeconds)
const showExamCard = ref(safeMockExamStorage.value.showCard)
const submitted = ref(safeMockExamStorage.value.submitted)
const autoSubmitted = ref(safeMockExamStorage.value.autoSubmitted)
const examObjectiveAnswers = reactive<Record<number, string | boolean | string[] | Record<number, any>>>({ ...safeMockExamStorage.value.objectiveAnswers })
const objectiveIds = ref<number[]>([...safeMockExamStorage.value.objectiveIds])
const objectiveOrder = ref<number[]>([...safeMockExamStorage.value.objectiveOrder])
const optionOrder = ref<Record<number, string[]>>({ ...safeMockExamStorage.value.optionOrder })

const practiceCategories = computed(() => ['全部', ...new Set(practiceQuestions.map(item => item.category))])
const filteredObjectiveQuestions = computed(() => {
  let result = practiceQuestions

  // 按题型筛选
  if (selectedTypes.value.length > 0) {
    result = result.filter(q => selectedTypes.value.includes(q.type))
  }

  // 按分类筛选
  if (selectedCategory.value !== '全部') {
    result = result.filter(q => q.category === selectedCategory.value)
  }

  return result
})

const currentPracticeObjective = computed(() => filteredObjectiveQuestions.value[objectiveIndex.value])

const objectiveMap = new Map(practiceQuestions.map(item => [item.id, item]))

const examObjectiveQuestions = computed(() =>
  objectiveOrder.value.map(id => objectiveMap.get(id)).filter((item): item is PracticeQuestion => Boolean(item)),
)

const currentExamQuestion = computed(() => examObjectiveQuestions.value[examCurrentIndex.value])
const examProgressText = computed(() => `${Math.min(examCurrentIndex.value + 1, examObjectiveQuestions.value.length || 1)} / ${examObjectiveQuestions.value.length || 0}`)
const examTimeText = computed(() => {
  const minutes = Math.floor(examRemainingSeconds.value / 60).toString().padStart(2, '0')
  const seconds = (examRemainingSeconds.value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
})

const objectiveCorrectCount = computed(() => examObjectiveQuestions.value.filter(item => isExamQuestionCorrect(item)).length)

// 判断考试题目是否正确
function isExamQuestionCorrect(question: PracticeQuestion): boolean {
  const userAnswer = examObjectiveAnswers[question.id]
  console.log(`[isExamQuestionCorrect] 题目ID: ${question.id}, 类型: ${question.type}`)
  console.log(`[isExamQuestionCorrect] 用户答案:`, userAnswer)
  console.log(`[isExamQuestionCorrect] 正确答案:`, question.answer)

  if (userAnswer === undefined) {
    console.log(`[isExamQuestionCorrect] 结果: false (未作答)`)
    return false
  }

  if (question.type === 'multiple') {
    const correctAnswer = question.answer as string[]
    const userAnswerArr = userAnswer as string[]
    const result = correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))
    console.log(`[isExamQuestionCorrect] 多选题结果: ${result}`)
    return result
  } else if (question.type === 'fillBlank') {
    const slots = question.fillSlots || []
    const userFillAnswer = userAnswer as Record<number, string>
    const result = slots.every(slot => {
      const userValue = userFillAnswer[slot.slotId] || ''
      return slot.keywords.some(keyword => {
        const kw = keyword.toLowerCase()
        const uv = userValue.toLowerCase()
        return uv.includes(kw) || kw.includes(uv)
      })
    })
    console.log(`[isExamQuestionCorrect] 填空题结果: ${result}`)
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
    console.log(`[isExamQuestionCorrect] 场景题结果: ${result}`)
    return result
  } else {
    const result = userAnswer === question.answer
    console.log(`[isExamQuestionCorrect] 单选/判断题结果: ${result}`)
    return result
  }
}

// 计算每道题的分数
function getExamQuestionScore(question: PracticeQuestion): number {
  const section = examConfig.sections.find(s => s.type === question.type)
  console.log(`[getExamQuestionScore] 题目ID: ${question.id}, 类型: ${question.type}`)

  if (!section) {
    console.log(`[getExamQuestionScore] 返回 0 (找不到section)`)
    return 0
  }

  // 填空题支持部分得分
  if (question.type === 'fillBlank') {
    const slots = question.fillSlots || []
    if (slots.length === 0) {
      console.log(`[getExamQuestionScore] 填空题返回 0 (没有空)`)
      return 0
    }
    const slotScore = section.scorePerQuestion / slots.length
    const userFillAnswer = examObjectiveAnswers[question.id] as Record<number, string> | undefined
    console.log(`[getExamQuestionScore] 填空题用户答案:`, userFillAnswer)
    let correctSlotCount = 0
    for (const slot of slots) {
      if (!userFillAnswer) continue
      const userValue = userFillAnswer[slot.slotId] || ''
      if (slot.keywords.some(keyword => {
        const kw = keyword.toLowerCase()
        const uv = userValue.toLowerCase()
        return uv.includes(kw) || kw.includes(uv)
      })) {
        correctSlotCount += 1
      }
    }
    const earned = slotScore * correctSlotCount
    console.log(`[getExamQuestionScore] 填空题得分: ${earned} (正确${correctSlotCount}/${slots.length}空)`)
    return earned
  }

  const correct = isExamQuestionCorrect(question)
  console.log(`[getExamQuestionScore] 是否正确: ${correct}`)
  if (correct) {
    if (question.type === 'scenario') {
      // 场景题按子问题得分计算
      const subQs = question.subQuestions || []
      const userScenarioAnswer = examObjectiveAnswers[question.id] as Record<number, any> | undefined
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
      console.log(`[getExamQuestionScore] 场景题得分: ${earnedScore}`)
      return earnedScore
    }
    console.log(`[getExamQuestionScore] 得分: ${section.scorePerQuestion}`)
    return section.scorePerQuestion
  }
  console.log(`[getExamQuestionScore] 得分: 0 (答错)`)
  return 0
}

// 计算考试总分（根据各题型分值）
const totalScore = computed(() => {
  console.log('========== 计算总分 ==========')
  let score = 0
  for (const question of examObjectiveQuestions.value) {
    const qScore = getExamQuestionScore(question)
    score += qScore
  }
  console.log(`总分: ${score}`)
  console.log('==============================')
  return score
})

// 获取题目分数（根据题型）
function getQuestionScoreValue(question: PracticeQuestion): number {
  const section = examConfig.sections.find(s => s.type === question.type)
  return section ? section.scorePerQuestion : 0
}

function shuffleArray<T>(list: T[]) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pickRandomIds<T extends { id: number }>(list: T[], count: number) {
  return shuffleArray(list.map(item => item.id)).slice(0, Math.min(count, list.length))
}

function syncPracticeStorage() {
  practiceStorage.value = {
    ...practiceStorage.value,
    category: selectedCategory.value,
    currentIndex: objectiveIndex.value,
    userAnswers: { ...userAnswers },
    objectiveCompleted: { ...practiceObjectiveCompleted },
    objectiveOrder: [...filteredObjectiveQuestions.value.map(item => item.id)],
    selectedTypes: [...selectedTypes.value],
  }
}

function syncMockExamStorage() {
  mockExamStorage.value = {
    ...mockExamStorage.value,
    started: examStarted.value,
    currentIndex: examCurrentIndex.value,
    unlockedIndex: examUnlockedIndex.value,
    remainingSeconds: examRemainingSeconds.value,
    showCard: showExamCard.value,
    objectiveAnswers: { ...examObjectiveAnswers },
    submitted: submitted.value,
    autoSubmitted: autoSubmitted.value,
    objectiveIds: [...objectiveIds.value],
    objectiveOrder: [...objectiveOrder.value],
    optionOrder: { ...optionOrder.value },
  }
}

function switchPageMode(mode: PageMode) {
  pageMode.value = mode
  router.replace({
    name: 'Practice',
    query: mode === 'exam' ? { mode: 'exam' } : {},
  })
}

function buildExamPaper() {
  // 按配置组卷：根据题型和数量抽取题目
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

  objectiveIds.value = selectedQuestions.map(q => q.id)
  objectiveOrder.value = [...objectiveIds.value] // 保持题型顺序，不再打乱
  optionOrder.value = Object.fromEntries(
    selectedQuestions
      .filter(item => item.type === 'single' && item.options)
      .map(item => [item.id, shuffleArray(item.options!.map(option => option.label))]),
  )
}

function resetExamAnswers() {
  for (const key of Object.keys(examObjectiveAnswers))
    delete examObjectiveAnswers[Number(key)]
}

function startExam(forceNew = false) {
  if (examStarted.value && !submitted.value && !forceNew)
    return
  if (forceNew || !objectiveIds.value.length || submitted.value)
    buildExamPaper()
  if (forceNew || submitted.value)
    resetExamAnswers()
  examStarted.value = true
  submitted.value = false
  autoSubmitted.value = false
  examCurrentIndex.value = 0
  examUnlockedIndex.value = 0
  examRemainingSeconds.value = durationMinutes * 60
  showExamCard.value = true
  allowExamLeave.value = false
  syncMockExamStorage()
}

function submitExam(isAuto = false) {
  submitted.value = true
  autoSubmitted.value = isAuto
  syncMockExamStorage()
}

function getOrderedOptions(question: PracticeQuestion) {
  if (question.type !== 'single' || !question.options)
    return []
  const labels = optionOrder.value[question.id] || question.options.map(item => item.label)
  return labels
    .map(label => question.options?.find(item => item.label === label))
    .filter((item): item is QuestionOption => Boolean(item))
}

function examOptionClass(question: PracticeQuestion, value: string | boolean) {
  const selected = examObjectiveAnswers[question.id]
  if (!submitted.value)
    return { selected: selected === value }
  return {
    selected: selected === value,
    correct: question.answer === value,
    wrong: selected === value && question.answer !== value,
  }
}

function isExamAnswered(question: PracticeQuestion) {
  return examObjectiveAnswers[question.id] !== undefined
}

function isExamCorrect(question: PracticeQuestion) {
  // 使用已有的 isExamQuestionCorrect 函数判断
  return isExamQuestionCorrect(question)
}

// 计算填空题正确的空数
function getExamFillCorrectCount(question: PracticeQuestion): { correct: number, total: number } {
  const slots = question.fillSlots || []
  if (slots.length === 0) return { correct: 0, total: 0 }
  const userFillAnswer = examObjectiveAnswers[question.id] as Record<number, string> | undefined
  if (!userFillAnswer) return { correct: 0, total: slots.length }

  let correctCount = 0
  for (const slot of slots) {
    const userValue = userFillAnswer[slot.slotId] || ''
    if (slot.keywords.some(keyword => {
      const kw = keyword.toLowerCase()
      const uv = userValue.toLowerCase()
      return uv.includes(kw) || kw.includes(uv)
    })) {
      correctCount += 1
    }
  }
  return { correct: correctCount, total: slots.length }
}

// 计算场景题正确的子题数
function getExamScenarioCorrectCount(question: PracticeQuestion): { correct: number, total: number } {
  const subQs = question.subQuestions || []
  if (subQs.length === 0) return { correct: 0, total: 0 }
  const userScenarioAnswer = examObjectiveAnswers[question.id] as Record<number, any> | undefined
  if (!userScenarioAnswer) return { correct: 0, total: subQs.length }

  let correctCount = 0
  for (const subQ of subQs) {
    const subAnswer = userScenarioAnswer[subQ.subId]
    if (subAnswer === undefined) continue

    let isCorrect = false
    if (subQ.type === 'multiple') {
      const correctAnswer = subQ.answer as string[]
      const userAnswerArr = subAnswer as string[]
      isCorrect = correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))
    } else if (subQ.type === 'fillBlank') {
      const slots = subQ.fillSlots || []
      isCorrect = slots.every(slot => {
        const userValue = (subAnswer as Record<number, string>)[slot.slotId] || ''
        return slot.keywords.some(keyword => {
          const kw = keyword.toLowerCase()
          const uv = userValue.toLowerCase()
          return uv.includes(kw) || kw.includes(uv)
        })
      })
    } else {
      isCorrect = subAnswer === subQ.answer
    }
    if (isCorrect) correctCount += 1
  }
  return { correct: correctCount, total: subQs.length }
}

function cardStatus(index: number) {
  if (!examStarted.value)
    return 'idle'
  if (submitted.value) {
    const question = examObjectiveQuestions.value[index]
    if (!question)
      return 'idle'
    if (!isExamAnswered(question))
      return 'pending' // 未作答 - 灰色

    // 填空题：计算部分正确
    if (question.type === 'fillBlank') {
      const { correct, total } = getExamFillCorrectCount(question)
      if (correct === 0) return 'wrong' // 全错 - 红色
      if (correct === total) return 'correct' // 全对 - 绿色
      return 'partial' // 部分正确 - 半红半绿
    }

    // 场景题：计算部分正确
    if (question.type === 'scenario') {
      const { correct, total } = getExamScenarioCorrectCount(question)
      if (correct === 0) return 'wrong' // 全错 - 红色
      if (correct === total) return 'correct' // 全对 - 绿色
      return 'partial' // 部分正确 - 半红半绿
    }

    // 其他题型
    return isExamCorrect(question) ? 'correct' : 'wrong'
  }
  if (index === examCurrentIndex.value)
    return 'current'
  return isExamAnswered(examObjectiveQuestions.value[index]) ? 'done' : 'todo'
}

function goToExamQuestion(index: number) {
  if (!examStarted.value)
    return
  examCurrentIndex.value = index
  scrollToQuestion('exam')
}

// 滚动到题目区域顶部
function scrollToQuestion(mode: 'practice' | 'exam') {
  nextTick(() => {
    const el = mode === 'practice' ? practiceQuestionRef.value : examQuestionRef.value
    if (el) {
      // 滚动到题目区域，并向上偏移 20px 以显示更多内容
      const rect = el.getBoundingClientRect()
      const scrollTop = window.pageYOffset + rect.top - 50
      window.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  })
}

function answerPracticeObjective(value: string | boolean | string[] | string[][] | Record<number, any>) {
  if (!currentPracticeObjective.value)
    return
  userAnswers[currentPracticeObjective.value.id] = value
  practiceObjectiveCompleted[currentPracticeObjective.value.id] = false
}

function answerExamObjective(value: string | boolean) {
  if (!currentExamQuestion.value || submitted.value)
    return
  examObjectiveAnswers[currentExamQuestion.value.id] = value
}

// 考试模式-多选题答案处理
function toggleExamMultipleAnswer(questionId: number, label: string) {
  if (submitted.value) return
  const current = examObjectiveAnswers[questionId] as string[] | undefined
  if (!current) {
    examObjectiveAnswers[questionId] = [label]
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        delete examObjectiveAnswers[questionId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
}

function isExamMultipleSelected(questionId: number, label: string): boolean {
  const current = examObjectiveAnswers[questionId] as string[] | undefined
  return current ? current.includes(label) : false
}

// 考试模式-填空题答案处理
function setExamFillBlankAnswer(questionId: number, slotId: number, value: string) {
  if (submitted.value) return
  const current = examObjectiveAnswers[questionId] as Record<number, string> | undefined
  if (!current) {
    examObjectiveAnswers[questionId] = { [slotId]: value }
  } else {
    current[slotId] = value
  }
}

function getExamFillBlankAnswer(questionId: number, slotId: number): string {
  const current = examObjectiveAnswers[questionId] as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

// 判断多选题是否正确
function isExamMultipleCorrect(question: PracticeQuestion): boolean {
  const correctAnswer = question.answer as string[]
  const userAnswer = examObjectiveAnswers[question.id] as string[] | undefined
  if (!userAnswer) return false
  return correctAnswer.length === userAnswer.length && correctAnswer.every(a => userAnswer.includes(a))
}

// 判断填空题单个空是否正确
function isExamFillSlotCorrect(question: PracticeQuestion, slot: FillBlankSlot): boolean {
  const userAnswer = getExamFillBlankAnswer(question.id, slot.slotId)
  if (!userAnswer) return false
  return slot.keywords.some(keyword => {
    const kw = keyword.toLowerCase()
    const uv = userAnswer.toLowerCase()
    return uv.includes(kw) || kw.includes(uv)
  })
}

// 判断场景题多选子题是否正确
function isExamScenarioMultipleCorrect(question: PracticeQuestion, subQ: ScenarioSubQuestion): boolean {
  const correctAnswer = subQ.answer as string[]
  const userAnswer = getExamScenarioAnswer(question.id, subQ.subId) as string[] | undefined
  if (!userAnswer) return false
  return correctAnswer.length === userAnswer.length && correctAnswer.every(a => userAnswer.includes(a))
}

// 判断场景题填空子题单个空是否正确
function isExamScenarioFillSlotCorrect(question: PracticeQuestion, subQ: ScenarioSubQuestion, slot: FillBlankSlot): boolean {
  const userAnswer = getExamScenarioFillBlankAnswer(question.id, subQ.subId, slot.slotId)
  if (!userAnswer) return false
  return slot.keywords.some(keyword => {
    const kw = keyword.toLowerCase()
    const uv = userAnswer.toLowerCase()
    return uv.includes(kw) || kw.includes(uv)
  })
}

// 考试模式-场景题子问题答案处理
function setExamScenarioAnswer(questionId: number, subId: number, value: string | boolean | string[] | Record<number, string>) {
  if (submitted.value) return
  const current = examObjectiveAnswers[questionId] as Record<number, any> | undefined
  if (!current) {
    examObjectiveAnswers[questionId] = { [subId]: value }
  } else {
    current[subId] = value
  }
}

function getExamScenarioAnswer(questionId: number, subId: number): string | boolean | string[] | Record<number, string> | undefined {
  const current = examObjectiveAnswers[questionId] as Record<number, any> | undefined
  return current ? current[subId] : undefined
}

function toggleExamScenarioMultipleAnswer(questionId: number, subId: number, label: string) {
  if (submitted.value) return
  const current = getExamScenarioAnswer(questionId, subId) as string[] | undefined
  if (!current) {
    setExamScenarioAnswer(questionId, subId, [label])
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        const parent = examObjectiveAnswers[questionId] as Record<number, any>
        delete parent[subId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
}

function isExamScenarioMultipleSelected(questionId: number, subId: number, label: string): boolean {
  const current = getExamScenarioAnswer(questionId, subId) as string[] | undefined
  return current ? current.includes(label) : false
}

function setExamScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number, value: string) {
  if (submitted.value) return
  const current = getExamScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  if (!current) {
    setExamScenarioAnswer(questionId, subId, { [slotId]: value })
  } else {
    current[slotId] = value
  }
}

function getExamScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number): string {
  const current = getExamScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

function completePracticeQuestion() {
  if (currentPracticeObjective.value && userAnswers[currentPracticeObjective.value.id] !== undefined) {
    practiceObjectiveCompleted[currentPracticeObjective.value.id] = true
  }
}

function handleNextOrShowAnswer() {
  // 如果答案未显示，先显示答案
  if (currentPracticeObjective.value && !practiceObjectiveCompleted[currentPracticeObjective.value.id]) {
    if (userAnswers[currentPracticeObjective.value.id] !== undefined) {
      practiceObjectiveCompleted[currentPracticeObjective.value.id] = true
    }
  } else {
    // 答案已显示，进入下一题
    if (objectiveIndex.value < filteredObjectiveQuestions.value.length - 1) {
      objectiveIndex.value += 1
      scrollToQuestion('practice')
    }
  }
}

function prevPracticeQuestion() {
  if (objectiveIndex.value > 0) {
    objectiveIndex.value -= 1
    scrollToQuestion('practice')
  }
}

function nextPracticeQuestion() {
  if (objectiveIndex.value < filteredObjectiveQuestions.value.length - 1) {
    objectiveIndex.value += 1
    scrollToQuestion('practice')
  }
}

function goToPracticeQuestion(index: number) {
  objectiveIndex.value = index
  scrollToQuestion('practice')
}

function prevExamQuestion() {
  if (examCurrentIndex.value > 0) {
    examCurrentIndex.value -= 1
    scrollToQuestion('exam')
  }
}

function nextExamQuestion() {
  if (examCurrentIndex.value < examObjectiveQuestions.value.length - 1) {
    examCurrentIndex.value += 1
    scrollToQuestion('exam')
  }
}

function exitExam() {
  const confirmed = window.confirm('退出考试会清除当前作答记录，确定退出吗？')
  if (!confirmed)
    return
  // 清除考试状态
  examStarted.value = false
  submitted.value = false
  autoSubmitted.value = false
  allowExamLeave.value = true
  syncMockExamStorage()
  // 切换到练习模式
  switchPageMode('practice')
}

// 筛选辅助函数
function getTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    fillBlank: '填空题',
    scenario: '场景题',
  }
  return labels[type]
}

function toggleTypeFilter(type: QuestionType) {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
}

function resetFilters() {
  selectedTypes.value = []
  selectedCategory.value = '全部'
}

// 多选题答案处理
function toggleMultipleAnswer(questionId: number, label: string) {
  const current = userAnswers[questionId] as string[] | undefined
  if (!current) {
    userAnswers[questionId] = [label]
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        delete userAnswers[questionId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
  practiceObjectiveCompleted[questionId] = false
}

function isMultipleSelected(questionId: number, label: string): boolean {
  const current = userAnswers[questionId] as string[] | undefined
  return current ? current.includes(label) : false
}

// 填空题答案处理
function setFillBlankAnswer(questionId: number, slotId: number, value: string) {
  const current = userAnswers[questionId] as Record<number, string> | undefined
  if (!current) {
    userAnswers[questionId] = { [slotId]: value }
  } else {
    current[slotId] = value
  }
  practiceObjectiveCompleted[questionId] = false
}

function getFillBlankAnswer(questionId: number, slotId: number): string {
  const current = userAnswers[questionId] as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

// 场景题子问题答案处理
function setScenarioAnswer(questionId: number, subId: number, value: string | boolean | string[] | Record<number, string>) {
  const current = userAnswers[questionId] as Record<number, any> | undefined
  if (!current) {
    userAnswers[questionId] = { [subId]: value }
  } else {
    current[subId] = value
  }
  practiceObjectiveCompleted[questionId] = false
}

function getScenarioAnswer(questionId: number, subId: number): string | boolean | string[] | Record<number, string> | undefined {
  const current = userAnswers[questionId] as Record<number, any> | undefined
  return current ? current[subId] : undefined
}

function toggleScenarioMultipleAnswer(questionId: number, subId: number, label: string) {
  const current = getScenarioAnswer(questionId, subId) as string[] | undefined
  if (!current) {
    setScenarioAnswer(questionId, subId, [label])
  } else {
    const index = current.indexOf(label)
    if (index > -1) {
      current.splice(index, 1)
      if (current.length === 0) {
        const parent = userAnswers[questionId] as Record<number, any>
        delete parent[subId]
      }
    } else {
      current.push(label)
      current.sort()
    }
  }
  practiceObjectiveCompleted[questionId] = false
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

function checkFillBlankSlot(slot: FillBlankSlot, userValue: string): boolean {
  if (!userValue) return false
  // 双向匹配：用户答案包含关键词，或关键词包含用户答案
  return slot.keywords.some(keyword => {
    const kw = keyword.toLowerCase()
    const uv = userValue.toLowerCase()
    return uv.includes(kw) || kw.includes(uv)
  })
}

function setScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number, value: string) {
  const current = getScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  if (!current) {
    setScenarioAnswer(questionId, subId, { [slotId]: value })
  } else {
    current[slotId] = value
  }
  practiceObjectiveCompleted[questionId] = false
}

function getScenarioFillBlankAnswer(questionId: number, subId: number, slotId: number): string {
  const current = getScenarioAnswer(questionId, subId) as Record<number, string> | undefined
  return current ? current[slotId] || '' : ''
}

function resetPracticeProgress() {
  const confirmed = window.confirm('确定清空当前练习记录吗？')
  if (!confirmed)
    return
  for (const key of Object.keys(userAnswers))
    delete userAnswers[Number(key)]
  for (const key of Object.keys(practiceObjectiveCompleted))
    delete practiceObjectiveCompleted[Number(key)]
  objectiveIndex.value = 0
  selectedCategory.value = '全部'
  selectedTypes.value = []
  syncPracticeStorage()
}

function restartExam() {
  const confirmed = window.confirm('确定重新开始考试吗？当前这套试卷和答案会被替换。')
  if (!confirmed)
    return
  startExam(true)
}

const currentPracticeIndexText = computed(() => {
  return `${Math.min(objectiveIndex.value + 1, filteredObjectiveQuestions.value.length)} / ${filteredObjectiveQuestions.value.length}`
})

const practiceCardItems = computed(() => {
  return filteredObjectiveQuestions.value.map((item, index) => {
    // 检查答案是否正确
    let isCorrect = false
    const userAnswer = userAnswers[item.id]
    if (practiceObjectiveCompleted[item.id] && userAnswer !== undefined) {
      if (item.type === 'multiple') {
        // 多选题：答案数组需要完全匹配
        const correctAnswer = item.answer as string[]
        const userAnswerArr = userAnswer as string[]
        isCorrect = correctAnswer.length === userAnswerArr.length && correctAnswer.every(a => userAnswerArr.includes(a))
      } else if (item.type === 'fillBlank') {
        // 填空题：每个空的关键词匹配（双向匹配）
        const slots = item.fillSlots || []
        const userFillAnswer = userAnswer as Record<number, string>
        isCorrect = slots.every(slot => {
          const userValue = userFillAnswer[slot.slotId] || ''
          // 双向匹配：用户答案包含关键词，或关键词包含用户答案
          return slot.keywords.some(keyword => {
            const kw = keyword.toLowerCase()
            const uv = userValue.toLowerCase()
            return uv.includes(kw) || kw.includes(uv)
          })
        })
      } else if (item.type === 'scenario') {
        // 场景题：每个子问题都要正确
        const subQs = item.subQuestions || []
        const userScenarioAnswer = userAnswer as Record<number, any>
        isCorrect = subQs.every(subQ => {
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
      } else {
        // 单选题和判断题：直接比较
        isCorrect = userAnswer === item.answer
      }
    }

    return {
      id: item.id,
      index,
      status: !practiceObjectiveCompleted[item.id]
        ? 'todo'
        : isCorrect
          ? 'correct'
          : 'wrong',
      active: index === objectiveIndex.value,
    }
  })
})

const isPracticeFirst = computed(() => objectiveIndex.value === 0)

const isPracticeLast = computed(() => objectiveIndex.value >= filteredObjectiveQuestions.value.length - 1)

const isPracticeAnswered = computed(() => {
  return currentPracticeObjective.value ? userAnswers[currentPracticeObjective.value.id] !== undefined : false
})

const isCurrentAnswerShown = computed(() => {
  return currentPracticeObjective.value ? practiceObjectiveCompleted[currentPracticeObjective.value.id] : false
})

watch(() => route.query.mode, (mode) => {
  pageMode.value = mode === 'exam' ? 'exam' : 'practice'
}, { immediate: true })

watch(selectedCategory, () => {
  objectiveIndex.value = 0
})

watch(filteredObjectiveQuestions, (list) => {
  if (!list.length) {
    objectiveIndex.value = 0
    return
  }
  if (objectiveIndex.value > list.length - 1)
    objectiveIndex.value = list.length - 1
}, { immediate: true })

watch(examObjectiveQuestions, (list) => {
  if (!list.length) {
    examCurrentIndex.value = 0
    examUnlockedIndex.value = 0
    return
  }
  if (examCurrentIndex.value > list.length - 1)
    examCurrentIndex.value = list.length - 1
  if (examUnlockedIndex.value > list.length - 1)
    examUnlockedIndex.value = list.length - 1
}, { immediate: true })

watch([selectedCategory, objectiveIndex], syncPracticeStorage)
watch(userAnswers, syncPracticeStorage, { deep: true })
watch(practiceObjectiveCompleted, syncPracticeStorage, { deep: true })

watch([examStarted, examCurrentIndex, examUnlockedIndex, examRemainingSeconds, showExamCard, submitted, autoSubmitted], syncMockExamStorage)
watch(examObjectiveAnswers, syncMockExamStorage, { deep: true })
watch([objectiveIds, objectiveOrder, optionOrder], syncMockExamStorage, { deep: true })

const examTimer = setInterval(() => {
  if (!examStarted.value || submitted.value)
    return
  if (examRemainingSeconds.value > 0) {
    examRemainingSeconds.value -= 1
    return
  }
  submitExam(true)
}, 1000)

onBeforeUnmount(() => clearInterval(examTimer))

onBeforeRouteLeave(() => {
  if (pageMode.value !== 'exam' || !examStarted.value || submitted.value || allowExamLeave.value)
    return true
  return window.confirm('当前考试正在进行，确定离开当前页面吗？')
})

useEventListener(window, 'beforeunload', (event) => {
  if (pageMode.value !== 'exam' || !examStarted.value || submitted.value || allowExamLeave.value)
    return
  event.preventDefault()
  event.returnValue = ''
})
</script>

<template>
  <div class="px-[12px] pt-[12px] pb-[90px] space-y-[14px]">
    <section class="hero-card rounded-[24px] p-[18px] text-white">
      <div class="text-[12px] tracking-[2px] uppercase opacity-80">
        Practice & Exam
      </div>
      <div class="text-[26px] font-bold mt-[8px]">
        练习答题与考试答题
      </div>
      <p class="text-[14px] leading-[24px] mt-[10px] text-white/85">
        练习模式按题型刷题，考试模式单独计时、答题卡和顺序解锁。错题本支持浏览器打印成 PDF，也可以导出 Word。
      </p>
      <div class="mode-switch mt-[16px]">
        <button type="button" class="mode-chip" :class="{ active: pageMode === 'practice' }" @click="switchPageMode('practice')">
          练习答题
        </button>
        <button type="button" class="mode-chip" :class="{ active: pageMode === 'exam' }" @click="switchPageMode('exam')">
          考试答题
        </button>
      </div>
    </section>

    <template v-if="pageMode === 'practice'">
      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex flex-wrap gap-[8px]">
          <van-button round type="primary" @click="switchPageMode('exam')">
            去考试答题
          </van-button>
          <router-link class="tool-link" :to="{ name: 'WrongBookExport' }">
            导出错题本
          </router-link>
          <router-link class="tool-link" :to="{ name: 'PrintPack' }">
            打印速记
          </router-link>
          <van-button round plain  @click="resetPracticeProgress">
            清空练习记录
          </van-button>
        </div>
      </section>

      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="section-title">
          题目分类
        </div>
        <div class="mt-[12px] flex flex-wrap gap-[8px]">
          <button
            v-for="category in practiceCategories"
            :key="category"
            type="button"
            class="category-chip"
            :class="{ active: selectedCategory === category }"
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </div>

        <div class="mt-[12px] text-[13px] text-[var(--van-text-color-2)]">
          当前进度：{{ currentPracticeIndexText }}
        </div>
      </section>

      <!-- 多维筛选器 -->
      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex items-center justify-between">
          <div class="section-title">
            多维筛选
          </div>
          <van-button size="small" type="primary" @click="showFilterPopup = true">
            {{ filterSummary }}
          </van-button>
        </div>
        <div class="mt-[10px] text-[13px] text-[var(--van-text-color-2)]">
          当前筛选结果：共 {{ filteredObjectiveQuestions.length }} 道题目
        </div>
      </section>

      <!-- 筛选弹窗 -->
      <van-popup
        v-model:show="showFilterPopup"
        position="bottom"
        round
        :style="{ height: '70%' }"
      >
        <div class="filter-popup-content">
          <div class="filter-popup-header">
            <div class="text-[18px] font-bold">筛选题目</div>
            <van-icon name="cross" size="24" @click="showFilterPopup = false" />
          </div>

          <div class="filter-popup-body">
            <!-- 题型筛选 -->
            <div class="filter-section">
              <div class="filter-section-title">题型</div>
              <div class="flex flex-wrap gap-[10px]">
                <button
                  type="button"
                  class="filter-chip"
                  :class="{ active: selectedTypes.length === 0 }"
                  @click="selectedTypes = []"
                >
                  全部
                </button>
                <button
                  v-for="type in ['single', 'multiple', 'judge', 'fillBlank', 'scenario']"
                  :key="type"
                  type="button"
                  class="filter-chip"
                  :class="{ active: selectedTypes.includes(type as QuestionType) }"
                  @click="toggleTypeFilter(type as QuestionType)"
                >
                  {{ getTypeLabel(type as QuestionType) }}
                </button>
              </div>
            </div>
          </div>

          <div class="filter-popup-footer">
            <van-button block plain @click="resetFilters">
              重置
            </van-button>
            <van-button block type="primary" @click="showFilterPopup = false">
              确认筛选
            </van-button>
          </div>
        </div>
      </van-popup>

      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex items-center justify-between">
          <div class="section-title">
            练习答题卡
          </div>
          <div class="text-[13px] text-[var(--van-text-color-2)]">
            完成情况
          </div>
        </div>
        <div class="grid grid-cols-6 gap-[8px] mt-[12px]">
          <button
            v-for="item in practiceCardItems"
            :key="item.id"
            type="button"
            class="card-item"
            :class="{
              current: item.active,
              correct: !item.active && item.status === 'correct',
              wrong: !item.active && item.status === 'wrong',
              todo: !item.active && item.status === 'todo',
            }"
            @click="goToPracticeQuestion(item.index)"
          >
            {{ item.index + 1 }}
          </button>
        </div>
      </section>

      <section ref="practiceQuestionRef" v-if="currentPracticeObjective" class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[13px] text-[var(--van-text-color-2)]">
            {{ currentPracticeObjective.category }}
          </div>
          <div class="flex items-center gap-[8px]">
            <span class="type-tag">{{ getTypeLabel(currentPracticeObjective.type) }}</span>
            <span v-if="currentPracticeObjective.difficulty" class="difficulty-tag">{{ currentPracticeObjective.difficulty }}</span>
            <span class="progress-tag">{{ currentPracticeIndexText }}</span>
          </div>
        </div>

        <!-- 场景题描述 -->
        <div v-if="currentPracticeObjective.type === 'scenario' && currentPracticeObjective.scenarioDesc" class="scenario-desc-box mt-[12px]">
          <div class="font-bold text-[var(--color-brand-deep)]">
            场景描述
          </div>
          <div class="mt-[8px] text-[15px] leading-[24px]">
            {{ currentPracticeObjective.scenarioDesc }}
          </div>
        </div>

        <div class="text-[20px] leading-[30px] font-bold mt-[12px] text-[var(--color-brand-deep)]">
          {{ currentPracticeObjective.stem }}
        </div>

        <!-- 单选题 -->
        <div v-if="currentPracticeObjective.type === 'single'" class="mt-[14px] space-y-[10px]">
          <button
            v-for="option in currentPracticeObjective.options"
            :key="option.label"
            type="button"
            class="answer-card"
            :class="{ selected: userAnswers[currentPracticeObjective.id] === option.label }"
            @click="answerPracticeObjective(option.label)"
          >
            <span class="answer-label">{{ option.label }}</span>
            <span class="flex-1 text-left">{{ option.text }}</span>
          </button>
        </div>

        <!-- 多选题 -->
        <div v-else-if="currentPracticeObjective.type === 'multiple'" class="mt-[14px] space-y-[10px]">
          <button
            v-for="option in currentPracticeObjective.options"
            :key="option.label"
            type="button"
            class="answer-card"
            :class="{ selected: isMultipleSelected(currentPracticeObjective.id, option.label) }"
            @click="toggleMultipleAnswer(currentPracticeObjective.id, option.label)"
          >
            <span class="answer-label">{{ option.label }}</span>
            <span class="flex-1 text-left">{{ option.text }}</span>
          </button>
          <div class="mt-[8px] text-[12px] text-[var(--van-text-color-2)]">
            多选题：可选择多个答案，点击已选项可取消
          </div>
        </div>

        <!-- 判断题 -->
        <div v-else-if="currentPracticeObjective.type === 'judge'" class="mt-[14px] space-y-[10px]">
          <button
            type="button"
            class="answer-card"
            :class="{ selected: userAnswers[currentPracticeObjective.id] === true }"
            @click="answerPracticeObjective(true)"
          >
            <span class="answer-label">A</span>
            <span class="flex-1 text-left">正确</span>
          </button>
          <button
            type="button"
            class="answer-card"
            :class="{ selected: userAnswers[currentPracticeObjective.id] === false }"
            @click="answerPracticeObjective(false)"
          >
            <span class="answer-label">B</span>
            <span class="flex-1 text-left">错误</span>
          </button>
        </div>

        <!-- 填空题 -->
        <div v-else-if="currentPracticeObjective.type === 'fillBlank'" class="mt-[14px] space-y-[12px]">
          <div
            v-for="slot in currentPracticeObjective.fillSlots"
            :key="slot.slotId"
            class="fill-blank-item"
          >
            <div class="text-[14px] font-bold text-[var(--color-brand-deep)] mb-[6px]">
              第 {{ slot.slotId }} 空
            </div>
            <van-field
              :model-value="getFillBlankAnswer(currentPracticeObjective.id, slot.slotId)"
              :placeholder="slot.placeholder"
              clearable
              @update:model-value="(val: string) => setFillBlankAnswer(currentPracticeObjective.id, slot.slotId, val)"
            />
          </div>
          <div class="mt-[8px] text-[12px] text-[var(--van-text-color-2)]">
            填空题：答案包含关键词即可得分
          </div>
        </div>

        <!-- 场景题子问题 -->
        <div v-else-if="currentPracticeObjective.type === 'scenario'" class="mt-[14px] space-y-[16px]">
          <div
            v-for="subQ in currentPracticeObjective.subQuestions"
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
                :class="{ selected: getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === true }"
                @click="setScenarioAnswer(currentPracticeObjective.id, subQ.subId, true)"
              >
                <span class="answer-label small">A</span>
                <span class="flex-1 text-left">正确</span>
              </button>
              <button
                type="button"
                class="answer-card small"
                :class="{ selected: getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === false }"
                @click="setScenarioAnswer(currentPracticeObjective.id, subQ.subId, false)"
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
                :class="{ selected: getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === option.label }"
                @click="setScenarioAnswer(currentPracticeObjective.id, subQ.subId, option.label)"
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
                :class="{ selected: isScenarioMultipleSelected(currentPracticeObjective.id, subQ.subId, option.label) }"
                @click="toggleScenarioMultipleAnswer(currentPracticeObjective.id, subQ.subId, option.label)"
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
                  :model-value="getScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId)"
                  :placeholder="slot.placeholder"
                  clearable
                  @update:model-value="(val: string) => setScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId, val)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 答案解析 -->
        <div v-if="practiceObjectiveCompleted[currentPracticeObjective.id]" class="analysis-box mt-[14px]">
          <!-- 单选/判断题答案 -->
          <div v-if="currentPracticeObjective.type === 'single' || currentPracticeObjective.type === 'judge'">
            <div class="text-[14px]">
              <span class="text-[var(--van-text-color-2)]">正确答案：</span>
              <span class="font-bold">{{ currentPracticeObjective.answer === true ? '正确' : currentPracticeObjective.answer === false ? '错误' : currentPracticeObjective.answer }}</span>
            </div>
            <div class="text-[14px] mt-[4px]">
              <span class="text-[var(--van-text-color-2)]">你的答案：</span>
              <span :class="userAnswers[currentPracticeObjective.id] === currentPracticeObjective.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                {{ userAnswers[currentPracticeObjective.id] === true ? '正确' : userAnswers[currentPracticeObjective.id] === false ? '错误' : userAnswers[currentPracticeObjective.id] || '未作答' }}
              </span>
              <span :class="userAnswers[currentPracticeObjective.id] === currentPracticeObjective.answer ? 'text-green-600' : 'text-red-500'">
                {{ userAnswers[currentPracticeObjective.id] === currentPracticeObjective.answer ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>

          <!-- 多选题答案 -->
          <div v-else-if="currentPracticeObjective.type === 'multiple'">
            <div class="text-[14px]">
              <span class="text-[var(--van-text-color-2)]">正确答案：</span>
              <span class="font-bold">{{ (currentPracticeObjective.answer as string[]).join('、') }}</span>
            </div>
            <div class="text-[14px] mt-[4px]">
              <span class="text-[var(--van-text-color-2)]">你的答案：</span>
              <span :class="(currentPracticeObjective.answer as string[]).length === (userAnswers[currentPracticeObjective.id] as string[])?.length && (currentPracticeObjective.answer as string[]).every(a => (userAnswers[currentPracticeObjective.id] as string[])?.includes(a)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                {{ (userAnswers[currentPracticeObjective.id] as string[])?.join('、') || '未作答' }}
              </span>
              <span :class="(currentPracticeObjective.answer as string[]).length === (userAnswers[currentPracticeObjective.id] as string[])?.length && (currentPracticeObjective.answer as string[]).every(a => (userAnswers[currentPracticeObjective.id] as string[])?.includes(a)) ? 'text-green-600' : 'text-red-500'">
                {{ (currentPracticeObjective.answer as string[]).length === (userAnswers[currentPracticeObjective.id] as string[])?.length && (currentPracticeObjective.answer as string[]).every(a => (userAnswers[currentPracticeObjective.id] as string[])?.includes(a)) ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>

          <!-- 填空题答案 -->
          <div v-else-if="currentPracticeObjective.type === 'fillBlank'" class="space-y-[8px]">
            <div class="font-bold">
              填空题答案：
            </div>
            <div
              v-for="slot in currentPracticeObjective.fillSlots"
              :key="slot.slotId"
              class="fill-answer-row"
            >
              <div class="text-[14px]">
                <span class="text-[var(--van-text-color-2)]">第 {{ slot.slotId }} 空关键词：</span>
                <span class="font-bold">{{ slot.keywords.join(' / ') }}</span>
              </div>
              <div class="text-[14px] mt-[2px]">
                <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                <span :class="checkFillBlankSlot(slot, getFillBlankAnswer(currentPracticeObjective.id, slot.slotId)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                  {{ getFillBlankAnswer(currentPracticeObjective.id, slot.slotId) || '未填写' }}
                </span>
                <span :class="checkFillBlankSlot(slot, getFillBlankAnswer(currentPracticeObjective.id, slot.slotId)) ? 'text-green-600' : 'text-red-500'">
                  {{ checkFillBlankSlot(slot, getFillBlankAnswer(currentPracticeObjective.id, slot.slotId)) ? ' ✓' : ' ✗' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 场景题答案 -->
          <div v-else-if="currentPracticeObjective.type === 'scenario'">
            <div class="font-bold">
              子问题答案：
            </div>
            <div class="mt-[8px] space-y-[12px]">
              <div
                v-for="subQ in currentPracticeObjective.subQuestions"
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
                    <span :class="getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ getScenarioAnswer(currentPracticeObjective.id, subQ.subId) || '未作答' }}
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
                    <span :class="getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === true ? '正确' : getScenarioAnswer(currentPracticeObjective.id, subQ.subId) === false ? '错误' : '未作答' }}
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
                    <span :class="isScenarioMultipleCorrect(currentPracticeObjective.id, subQ) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ (getScenarioAnswer(currentPracticeObjective.id, subQ.subId) as string[])?.join('、') || '未作答' }}
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
                      <span :class="checkFillBlankSlot(slot, getScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId)) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                        {{ getScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId) || '未填写' }}
                      </span>
                      <span :class="checkFillBlankSlot(slot, getScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId)) ? 'text-green-600' : 'text-red-500'">
                        {{ checkFillBlankSlot(slot, getScenarioFillBlankAnswer(currentPracticeObjective.id, subQ.subId, slot.slotId)) ? ' ✓' : ' ✗' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-[8px] text-[14px] leading-[24px]">
            {{ currentPracticeObjective.explanation }}
          </div>
          <div class="proof-box mt-[10px]">
            <div class="font-bold">
              原句依据
            </div>
            <div class="mt-[4px] text-[14px] leading-[24px]">
              {{ currentPracticeObjective.proof }}
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex gap-[10px]">
          <van-button block plain :disabled="isPracticeFirst" @click="prevPracticeQuestion">
            上一题
          </van-button>
          <van-button
            block
            type="primary"
            :disabled="!isPracticeAnswered || (isCurrentAnswerShown && isPracticeLast)"
            @click="handleNextOrShowAnswer"
          >
            {{ isCurrentAnswerShown ? (isPracticeLast ? '已完成' : '进入下一题') : '查看答案' }}
          </van-button>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex flex-wrap items-center gap-[8px]">
          <van-button v-if="!examStarted" round type="primary" size="small" @click="startExam()">
            开始考试
          </van-button>
          <van-button v-else-if="submitted" round type="primary" size="small" @click="startExam(true)">
            重新考试
          </van-button>
          <div v-else class="status-chip">
            考试进行中
          </div>
          <van-button v-if="!examStarted || submitted" round plain size="small" @click="restartExam">
            重新组卷
          </van-button>
          <van-button round plain type="danger" size="small" @click="exitExam">
            退出考试
          </van-button>
          <router-link class="tool-link" :to="{ name: 'WrongBookExport' }">
            导出错题本
          </router-link>
        </div>
        <div class="exam-meta mt-[14px]">
          <div class="meta-box">
            <div class="meta-label">
              倒计时
            </div>
            <div class="meta-value">
              {{ examTimeText }}
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-label">
              题量
            </div>
            <div class="meta-value">
              {{ examObjectiveQuestions.length }} 题
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-label">
              进度
            </div>
            <div class="meta-value">
              {{ examProgressText }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="!examStarted" class="rounded-[20px] bg-[var(--color-block-background)] p-[18px] shadow-card">
        <div class="section-title">
          考试说明
        </div>
        <div class="mt-[12px] space-y-[10px] text-[14px] leading-[24px]">
          <div>1. 点击"开始考试"后才正式组卷并开始倒计时。</div>
          <div>2. 可以随意点击题目编号跳转答题，无需按顺序作答。</div>
          <div>3. 答题卡显示当前答题状态，方便快速定位。</div>
          <div>4. 退出、刷新或跳转页面时，会提示你是否离开当前考试。</div>
        </div>
      </section>

      <!-- 答题卡弹窗 -->
      <van-popup
        v-model:show="showExamCard"
        position="bottom"
        round
        :style="{ height: '60%' }"
      >
        <div class="p-[16px]">
          <div class="flex items-center justify-between mb-[12px]">
            <div class="section-title">
              答题卡
            </div>
            <van-icon name="cross" size="20" @click="showExamCard = false" />
          </div>
          <div class="grid grid-cols-6 gap-[8px]">
            <button
              v-for="(question, index) in examObjectiveQuestions"
              :key="question.id"
              type="button"
              class="card-item"
              :class="cardStatus(index)"
              @click="goToExamQuestion(index); showExamCard = false"
            >
              {{ index + 1 }}
            </button>
          </div>
          <div v-if="submitted" class="mt-[16px] flex flex-wrap gap-[12px] text-[14px]">
            <div class="flex items-center gap-[6px]">
              <span class="w-[20px] h-[20px] rounded-full bg-green-500 text-white text-[12px] flex items-center justify-center">✓</span>
              <span>全对</span>
            </div>
            <div class="flex items-center gap-[6px]">
              <span class="w-[20px] h-[20px] rounded-full overflow-hidden flex items-center justify-center" style="background: linear-gradient(135deg, #22c55e 50%, #ef4444 50%);color: white;font-size: 12px;">½</span>
              <span>部分正确</span>
            </div>
            <div class="flex items-center gap-[6px]">
              <span class="w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[12px] flex items-center justify-center">✗</span>
              <span>错误</span>
            </div>
            <div class="flex items-center gap-[6px]">
              <span class="w-[20px] h-[20px] rounded-full bg-gray-300 text-[12px] flex items-center justify-center">-</span>
              <span>未作答</span>
            </div>
          </div>
        </div>
      </van-popup>

      <!-- 悬浮答题卡按钮 -->
      <button
        v-if="examStarted"
        type="button"
        class="floating-card-btn"
        @click="showExamCard = true"
      >
        <van-icon name="apps-o" size="20" />
        <span class="text-[12px] mt-[2px]">答题卡</span>
      </button>

      <section ref="examQuestionRef" v-if="examStarted && currentExamQuestion" class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex items-center justify-between text-[13px] text-[var(--van-text-color-2)]">
          <span>{{ currentExamQuestion.category }}</span>
          <div class="flex items-center gap-[8px]">
            <span class="score-tag">{{ getQuestionScoreValue(currentExamQuestion) }} 分</span>
            <span>{{ examProgressText }}</span>
          </div>
        </div>

        <div class="text-[20px] leading-[30px] font-bold mt-[12px] text-[var(--color-brand-deep)]">
          {{ currentExamQuestion.stem }}
        </div>

        <!-- 单选题 -->
        <div v-if="currentExamQuestion.type === 'single'" class="mt-[14px] space-y-[10px]">
          <button
            v-for="option in getOrderedOptions(currentExamQuestion)"
            :key="option.label"
            type="button"
            class="answer-card"
            :disabled="submitted"
            :class="examOptionClass(currentExamQuestion, option.label)"
            @click="answerExamObjective(option.label)"
          >
            <span class="answer-label">{{ option.label }}</span>
            <span class="flex-1 text-left">{{ option.text }}</span>
          </button>
        </div>

        <!-- 多选题 -->
        <div v-else-if="currentExamQuestion.type === 'multiple'" class="mt-[14px] space-y-[10px]">
          <button
            v-for="option in currentExamQuestion.options"
            :key="option.label"
            type="button"
            class="answer-card"
            :disabled="submitted"
            :class="{ selected: isExamMultipleSelected(currentExamQuestion.id, option.label) }"
            @click="toggleExamMultipleAnswer(currentExamQuestion.id, option.label)"
          >
            <span class="answer-label">{{ option.label }}</span>
            <span class="flex-1 text-left">{{ option.text }}</span>
          </button>
          <div v-if="!submitted" class="mt-[8px] text-[12px] text-[var(--van-text-color-2)]">
            多选题：可选择多个答案
          </div>
        </div>

        <!-- 判断题 -->
        <div v-else-if="currentExamQuestion.type === 'judge'" class="mt-[14px] space-y-[10px]">
          <button
            type="button"
            class="answer-card"
            :disabled="submitted"
            :class="examOptionClass(currentExamQuestion, true)"
            @click="answerExamObjective(true)"
          >
            <span class="answer-label">A</span>
            <span class="flex-1 text-left">正确</span>
          </button>
          <button
            type="button"
            class="answer-card"
            :disabled="submitted"
            :class="examOptionClass(currentExamQuestion, false)"
            @click="answerExamObjective(false)"
          >
            <span class="answer-label">B</span>
            <span class="flex-1 text-left">错误</span>
          </button>
        </div>

        <!-- 填空题 -->
        <div v-else-if="currentExamQuestion.type === 'fillBlank'" class="mt-[14px] space-y-[12px]">
          <div
            v-for="slot in currentExamQuestion.fillSlots"
            :key="slot.slotId"
            class="fill-blank-item"
          >
            <div class="text-[14px] font-bold text-[var(--color-brand-deep)] mb-[6px]">
              第 {{ slot.slotId }} 空
            </div>
            <van-field
              :model-value="getExamFillBlankAnswer(currentExamQuestion.id, slot.slotId)"
              :placeholder="slot.placeholder"
              :disabled="submitted"
              clearable
              @update:model-value="(val: string) => setExamFillBlankAnswer(currentExamQuestion.id, slot.slotId, val)"
            />
          </div>
        </div>

        <!-- 场景题 -->
        <div v-else-if="currentExamQuestion.type === 'scenario'" class="mt-[14px] space-y-[16px]">
          <div v-if="currentExamQuestion.scenarioDesc" class="scenario-desc-box">
            <div class="font-bold text-[var(--color-brand-deep)]">
              场景描述
            </div>
            <div class="mt-[8px] text-[15px] leading-[24px]">
              {{ currentExamQuestion.scenarioDesc }}
            </div>
          </div>
          <div
            v-for="subQ in currentExamQuestion.subQuestions"
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
                :class="{ selected: getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === true }"
                :disabled="submitted"
                @click="setExamScenarioAnswer(currentExamQuestion.id, subQ.subId, true)"
              >
                <span class="answer-label small">A</span>
                <span class="flex-1 text-left">正确</span>
              </button>
              <button
                type="button"
                class="answer-card small"
                :class="{ selected: getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === false }"
                :disabled="submitted"
                @click="setExamScenarioAnswer(currentExamQuestion.id, subQ.subId, false)"
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
                :class="{ selected: getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === option.label }"
                :disabled="submitted"
                @click="setExamScenarioAnswer(currentExamQuestion.id, subQ.subId, option.label)"
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
                :class="{ selected: isExamScenarioMultipleSelected(currentExamQuestion.id, subQ.subId, option.label) }"
                :disabled="submitted"
                @click="toggleExamScenarioMultipleAnswer(currentExamQuestion.id, subQ.subId, option.label)"
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
                  :model-value="getExamScenarioFillBlankAnswer(currentExamQuestion.id, subQ.subId, slot.slotId)"
                  :placeholder="slot.placeholder"
                  :disabled="submitted"
                  clearable
                  @update:model-value="(val: string) => setExamScenarioFillBlankAnswer(currentExamQuestion.id, subQ.subId, slot.slotId, val)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 答案解析 -->
        <div v-if="submitted" class="analysis-box mt-[14px]">
          <!-- 单选/判断题答案 -->
          <div v-if="currentExamQuestion.type === 'single' || currentExamQuestion.type === 'judge'">
            <div class="text-[14px]">
              <span class="text-[var(--van-text-color-2)]">正确答案：</span>
              <span class="font-bold">{{ currentExamQuestion.answer === true ? '正确' : currentExamQuestion.answer === false ? '错误' : currentExamQuestion.answer }}</span>
            </div>
            <div class="text-[14px] mt-[4px]">
              <span class="text-[var(--van-text-color-2)]">你的答案：</span>
              <span :class="examObjectiveAnswers[currentExamQuestion.id] === currentExamQuestion.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                {{ examObjectiveAnswers[currentExamQuestion.id] === true ? '正确' : examObjectiveAnswers[currentExamQuestion.id] === false ? '错误' : examObjectiveAnswers[currentExamQuestion.id] || '未作答' }}
              </span>
              <span :class="examObjectiveAnswers[currentExamQuestion.id] === currentExamQuestion.answer ? 'text-green-600' : 'text-red-500'">
                {{ examObjectiveAnswers[currentExamQuestion.id] === currentExamQuestion.answer ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>

          <!-- 多选题答案 -->
          <div v-else-if="currentExamQuestion.type === 'multiple'">
            <div class="text-[14px]">
              <span class="text-[var(--van-text-color-2)]">正确答案：</span>
              <span class="font-bold">{{ (currentExamQuestion.answer as string[]).join('、') }}</span>
            </div>
            <div class="text-[14px] mt-[4px]">
              <span class="text-[var(--van-text-color-2)]">你的答案：</span>
              <span :class="isExamMultipleCorrect(currentExamQuestion) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                {{ (examObjectiveAnswers[currentExamQuestion.id] as string[])?.join('、') || '未作答' }}
              </span>
              <span :class="isExamMultipleCorrect(currentExamQuestion) ? 'text-green-600' : 'text-red-500'">
                {{ isExamMultipleCorrect(currentExamQuestion) ? ' ✓' : ' ✗' }}
              </span>
            </div>
          </div>

          <!-- 填空题答案 -->
          <div v-else-if="currentExamQuestion.type === 'fillBlank'" class="space-y-[8px]">
            <div class="font-bold">
              填空题答案：
            </div>
            <div
              v-for="slot in currentExamQuestion.fillSlots"
              :key="slot.slotId"
              class="fill-answer-row"
            >
              <div class="text-[14px]">
                <span class="text-[var(--van-text-color-2)]">第 {{ slot.slotId }} 空关键词：</span>
                <span class="font-bold">{{ slot.keywords.join(' / ') }}</span>
              </div>
              <div class="text-[14px] mt-[2px]">
                <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                <span :class="isExamFillSlotCorrect(currentExamQuestion, slot) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                  {{ getExamFillBlankAnswer(currentExamQuestion.id, slot.slotId) || '未填' }}
                </span>
                <span :class="isExamFillSlotCorrect(currentExamQuestion, slot) ? 'text-green-600' : 'text-red-500'">
                  {{ isExamFillSlotCorrect(currentExamQuestion, slot) ? ' ✓' : ' ✗' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 场景题答案 -->
          <div v-else-if="currentExamQuestion.type === 'scenario'">
            <div class="font-bold">
              子问题答案：
            </div>
            <div class="mt-[8px] space-y-[12px]">
              <div
                v-for="subQ in currentExamQuestion.subQuestions"
                :key="subQ.subId"
                class="sub-answer-box"
              >
                <div class="text-[14px] font-bold text-[var(--color-brand-deep)]">
                  问题 {{ subQ.subId }}（{{ subQ.type === 'judge' ? '判断' : subQ.type === 'multiple' ? '多选' : subQ.type === 'single' ? '单选' : '填空' }}）
                </div>
                <div v-if="subQ.type === 'single'" class="mt-[6px]">
                  <div class="text-[14px]">
                    <span class="text-[var(--van-text-color-2)]">正确答案：</span>
                    <span class="font-bold">{{ subQ.answer }}</span>
                  </div>
                  <div class="text-[14px] mt-[4px]">
                    <span class="text-[var(--van-text-color-2)]">你的答案：</span>
                    <span :class="getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) || '未作答' }}
                    </span>
                    <span :class="getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? 'text-green-600' : 'text-red-500'">
                      {{ getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? ' ✓' : ' ✗' }}
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
                    <span :class="getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === true ? '正确' : getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === false ? '错误' : '未作答' }}
                    </span>
                    <span :class="getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? 'text-green-600' : 'text-red-500'">
                      {{ getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) === subQ.answer ? ' ✓' : ' ✗' }}
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
                    <span :class="isExamScenarioMultipleCorrect(currentExamQuestion, subQ) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      {{ (getExamScenarioAnswer(currentExamQuestion.id, subQ.subId) as string[])?.join('、') || '未作答' }}
                    </span>
                    <span :class="isExamScenarioMultipleCorrect(currentExamQuestion, subQ) ? 'text-green-600' : 'text-red-500'">
                      {{ isExamScenarioMultipleCorrect(currentExamQuestion, subQ) ? ' ✓' : ' ✗' }}
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
                      <span :class="isExamScenarioFillSlotCorrect(currentExamQuestion, subQ, slot) ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                        {{ getExamScenarioFillBlankAnswer(currentExamQuestion.id, subQ.subId, slot.slotId) || '未填' }}
                      </span>
                      <span :class="isExamScenarioFillSlotCorrect(currentExamQuestion, subQ, slot) ? 'text-green-600' : 'text-red-500'">
                        {{ isExamScenarioFillSlotCorrect(currentExamQuestion, subQ, slot) ? ' ✓' : ' ✗' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-[12px] text-[14px] leading-[24px]">
            <span class="font-bold">解析：</span>{{ currentExamQuestion.explanation }}
          </div>
          <div class="proof-box mt-[10px]">
            <div class="font-bold">
              原句依据
            </div>
            <div class="mt-[4px] text-[14px] leading-[24px]">
              {{ currentExamQuestion.proof }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="examStarted" class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
        <div class="flex gap-[10px]">
          <van-button block plain :disabled="examCurrentIndex === 0" @click="prevExamQuestion">
            上一题
          </van-button>
          <van-button block type="primary" :disabled="examCurrentIndex >= examObjectiveQuestions.length - 1" @click="nextExamQuestion">
            {{ examCurrentIndex >= examObjectiveQuestions.length - 1 ? '已是最后一题' : '下一题' }}
          </van-button>
        </div>
        <div class="mt-[12px] flex gap-[10px]">
          <van-button block plain type="success" :disabled="submitted" @click="submitExam(false)">
            交卷
          </van-button>
          <van-button block plain :disabled="!submitted" @click="startExam(true)">
            重新考试
          </van-button>
        </div>
      </section>

      <section v-if="submitted" class="rounded-[20px] p-[16px]" :class="totalScore >= 85 ? 'score-pass' : 'score-warn'">
        <div class="text-[14px] opacity-80">
          {{ autoSubmitted ? '倒计时结束，系统已自动交卷' : '考试已交卷' }}
        </div>
        <div class="text-[36px] font-bold mt-[6px]">
          {{ totalScore }} 分
        </div>
        <div class="mt-[14px]">
          正确 {{ objectiveCorrectCount }} 题 / 共 {{ examObjectiveQuestions.length }} 题
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped lang="less">
.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 236, 179, 0.38), transparent 32%),
    radial-gradient(circle at left bottom, rgba(255, 255, 255, 0.18), transparent 28%),
    linear-gradient(135deg, #0f766e, #155e75 52%, #1d4ed8);
  box-shadow: 0 18px 40px rgba(15, 118, 110, 0.22);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.mode-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-chip,
.category-chip,
.tool-link {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
}

.mode-chip {
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.88);
}

.mode-chip.active {
  background: var(--color-block-background);
  color: var(--color-brand-deep);
  font-weight: 700;
}

.category-chip {
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  border: 1px solid var(--color-border);
}

.category-chip.active {
  background: var(--color-success-bg);
  border-color: var(--color-brand);
}

.tool-link {
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  border: 1px solid var(--color-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  text-decoration: none;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 999px;
  padding: 8px 14px;
  background: var(--color-success-bg);
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
}

.answer-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid var(--color-border);
  background: var(--color-block-background);
  padding: 14px;
  font-size: 15px;
  color: var(--van-text-color);
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
  color: var(--color-answer-correct);
}

.answer-card.wrong {
  border-color: var(--color-error);
  background: var(--color-error-bg);
  color: var(--color-answer-wrong);
}

.answer-card:disabled {
  opacity: 1;
}

.answer-label {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-soft-card);
  color: var(--color-brand);
  font-weight: 700;
}

.analysis-box,
.proof-box,
.meta-box,
.score-box {
  border-radius: 18px;
}

.analysis-box {
  background: var(--color-sub-question-bg);
  padding: 14px;
}

.proof-box {
  background: var(--color-scenario-bg);
  padding: 12px;
}

.card-item {
  height: 40px;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: var(--color-chip-bg);
  color: var(--color-chip-text);
}

.card-item.current {
  background: var(--color-brand);
  color: #fff;
}

.card-item.done {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.card-item.correct {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.card-item.wrong {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.card-item.partial {
  background: linear-gradient(135deg, var(--color-success-bg) 50%, var(--color-error-bg) 50%);
  color: var(--color-brand);
  position: relative;
}

.card-item.pending {
  background: #e5e7eb;
  color: #6b7280;
}

.card-item.todo {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.card-item.locked {
  background: var(--color-chip-bg);
  color: var(--color-text-secondary);
}

.exam-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.meta-box {
  background: var(--color-soft-card);
  padding: 12px;
}

.meta-label {
  font-size: 12px;
  color: var(--van-text-color-2);
}

.meta-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.score-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 28px;
  border-radius: 999px;
  padding: 0 10px;
  background: var(--color-tag-bg);
  color: var(--color-tag-text);
  font-size: 12px;
  font-weight: 700;
}

.score-pass {
  background: var(--color-success-bg);
}

.score-warn {
  background: var(--color-error-bg);
}

.floating-card-btn {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-brand);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.floating-card-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.result-row {
  border-radius: 18px;
  padding: 14px;
  background: var(--color-chip-bg);
  border: 1px solid transparent;
}

.result-row.correct {
  background: var(--color-success-bg);
  border-color: var(--color-success);
}

.result-row.wrong {
  background: var(--color-error-bg);
  border-color: var(--color-error);
}

.result-row.pending {
  background: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.result-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.result-stem {
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text);
}

.result-score {
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand-deep);
}

.result-meta {
  margin-top: 8px;
  font-size: 13px;
  color: var(--van-text-color-2);
}

@media (max-width: 768px) {
  .exam-meta {
    grid-template-columns: 1fr;
  }
}

// 筛选器样式
.filter-chip {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  border: 1px solid var(--color-border);
}

.filter-chip.active {
  background: var(--color-success-bg);
  border-color: var(--color-brand);
  font-weight: 700;
}

// 筛选弹窗样式
.filter-popup-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-block-background);
}

.filter-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.filter-popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-brand-deep);
  margin-bottom: 12px;
}

.filter-popup-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-block-background);
}

// 题型和难度标签
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

.difficulty-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: 12px;
  font-weight: 700;
}

.progress-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  height: 24px;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--color-brand);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
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

.sub-answer-box {
  background: var(--color-soft-card);
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
}

.fill-answer-row {
  padding: 8px;
  background: var(--color-block-background);
  border-radius: 10px;
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
</style>