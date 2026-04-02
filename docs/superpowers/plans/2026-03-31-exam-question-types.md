# 卡赢考试系统题型扩展实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展考试系统，新增多选题、填空题、场景题，支持难度标签和多维分类筛选。

**Architecture:** 在现有 Vue3 + Vant 组件架构上最小化扩展，复用已有 `exam.ts` 数据结构和 `practice/index.vue` UI 模式。新增题型通过扩展类型定义和可选字段实现，保持向后兼容。

**Tech Stack:** Vue 3、TypeScript、Vant 4、VueUse、Less、LocalStorage

---

## 文件结构

| 文件 | 操作 | 责任 |
|------|------|------|
| `src/data/exam.ts` | 修改 | 扩展类型定义，添加新题型数据、试卷配置 |
| `src/views/practice/index.vue` | 修改 | 新增多选题、填空题、场景题 UI，多维筛选器 |
| `src/views/mock-exam/index.vue` | 修改 | 适配新题型和评分逻辑 |
| `src/views/home/index.vue` | 修改 | 更新考试说明信息 |

---

## Task 1: 扩展类型定义

**Files:**
- Modify: `src/data/exam.ts:1-18`

- [ ] **Step 1: 扩展 QuestionType 类型**

在 `src/data/exam.ts` 文件顶部，将 `QuestionType` 从 `'single' | 'judge'` 扩展为五种题型：

```typescript
export type QuestionType = 'single' | 'multiple' | 'judge' | 'fillBlank' | 'scenario'
```

- [ ] **Step 2: 添加填空题空位接口**

在 `QuestionOption` 接口后添加 `FillBlankSlot` 接口：

```typescript
export interface FillBlankSlot {
  slotId: number
  placeholder: string
  keywords: string[]
}
```

- [ ] **Step 3: 添加场景题子题接口**

在 `FillBlankSlot` 接口后添加 `ScenarioSubQuestion` 接口：

```typescript
export interface ScenarioSubQuestion {
  subId: number
  type: 'judge' | 'multiple' | 'fillBlank'
  stem: string
  options?: QuestionOption[]
  fillSlots?: FillBlankSlot[]
  answer: string[] | boolean | string | string[]
  explanation: string
  proof: string
  score: number
}
```

- [ ] **Step 4: 扩展 PracticeQuestion 接口**

修改现有 `PracticeQuestion` 接口，添加新字段：

```typescript
export interface PracticeQuestion {
  id: number
  type: QuestionType
  category: string
  tags?: string[]
  difficulty?: string
  stem: string
  options?: QuestionOption[]
  fillSlots?: FillBlankSlot[]
  scenarioDesc?: string
  subQuestions?: ScenarioSubQuestion[]
  answer: string | string[] | boolean | FillBlankSlot[]
  explanation: string
  proof: string
}
```

- [ ] **Step 5: 添加试卷配置接口**

在 `PracticeQuestion` 接口后添加试卷配置相关接口：

```typescript
export interface ExamSection {
  type: 'single' | 'multiple' | 'judge' | 'fillBlank' | 'scenario'
  title: string
  questionCount: number
  scorePerQuestion: number
  totalScore: number
}

export interface ExamPaperConfig {
  title: string
  durationMinutes: number
  totalScore: number
  passScore: number
  sections: ExamSection[]
}

export interface PracticeConfig {
  selectedTypes: QuestionType[]
  selectedCategories: string[]
  selectedTags: string[]
  selectedDifficulty: string[]
  questionCount: number
}
```

- [ ] **Step 6: 添加默认配置常量**

在接口定义后添加默认配置：

```typescript
export const defaultExamConfig: ExamPaperConfig = {
  title: '卡赢科技产品体系命名规则考试',
  durationMinutes: 45,
  totalScore: 99,
  passScore: 85,
  sections: [
    { type: 'single', title: '单选题', questionCount: 10, scorePerQuestion: 3, totalScore: 30 },
    { type: 'judge', title: '判断题', questionCount: 10, scorePerQuestion: 2, totalScore: 20 },
    { type: 'fillBlank', title: '填空题', questionCount: 17, scorePerQuestion: 2, totalScore: 34 },
    { type: 'scenario', title: '场景题', questionCount: 1, scorePerQuestion: 15, totalScore: 15 },
  ],
}

export const defaultPracticeConfig: PracticeConfig = {
  selectedTypes: ['single', 'judge', 'fillBlank', 'scenario'],
  selectedCategories: ['全部'],
  selectedTags: [],
  selectedDifficulty: [],
  questionCount: 20,
}
```

- [ ] **Step 7: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 8: 提交类型扩展**

```bash
git add src/data/exam.ts
git commit -m "feat: 扩展题型类型定义，新增多选、填空、场景题接口

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 添加多选题数据

**Files:**
- Modify: `src/data/exam.ts` (在 `practiceQuestions` 数组末尾追加)

- [ ] **Step 1: 添加多选题数据**

在 `practiceQuestions` 数组末尾添加多选题数据（至少10道）：

```typescript
// ===== 多选题 =====
{
  id: 101,
  type: 'multiple',
  category: '平台定义',
  tags: ['卡控', '星辰', '赢商城'],
  difficulty: '基础',
  stem: '以下哪些是卡赢科技的三大核心业务平台？',
  options: [
    { label: 'A', text: '卡控' },
    { label: 'B', text: '星辰' },
    { label: 'C', text: '赢商城' },
    { label: 'D', text: '速度猫' },
  ],
  answer: ['A', 'B', 'C'],
  explanation: '卡控、星辰、赢商城是三大核心平台，速度猫是控股子公司独立运营。',
  proof: '文档"公司现有三大核心业务平台"部分明确列出卡控、星辰、赢商城。',
},
{
  id: 102,
  type: 'multiple',
  category: '产品归属',
  tags: ['智捷通', '数益达', '物销易'],
  difficulty: '基础',
  stem: '以下哪些产品属于通用型产品，可在卡控和星辰平台使用？',
  options: [
    { label: 'A', text: '智捷通' },
    { label: 'B', text: '智企推' },
    { label: 'C', text: '数益达' },
    { label: 'D', text: '物销易' },
  ],
  answer: ['A', 'C', 'D'],
  explanation: '智捷通、数益达、物销易是通用型产品；智企推是卡控专属产品。',
  proof: '文档"通用型产品（可归属多个平台）"中列出智捷通、数益达、物销易。',
},
{
  id: 103,
  type: 'multiple',
  category: '产品归属',
  tags: ['智企推', '好车服', '卡控'],
  difficulty: '基础',
  stem: '以下哪些产品属于卡控平台专属产品？',
  options: [
    { label: 'A', text: '智企推' },
    { label: 'B', text: '好车服' },
    { label: 'C', text: '慧商通' },
    { label: 'D', text: '智捷通' },
  ],
  answer: ['A', 'B'],
  explanation: '智企推和好车服是卡控平台专属产品；慧商通归属赢商城，智捷通是通用型产品。',
  proof: '文档"卡控平台专属产品"部分明确列出智企推、好车服。',
},
{
  id: 104,
  type: 'multiple',
  category: '业务场景',
  tags: ['智企推', '保险营销', '媒介投放'],
  difficulty: '进阶',
  stem: '智企推承接的业务类型包括以下哪些？',
  options: [
    { label: 'A', text: '银行分期推广' },
    { label: 'B', text: '媒介投放' },
    { label: 'C', text: '保险精准营销' },
    { label: 'D', text: '洗车服务' },
  ],
  answer: ['A', 'B', 'C'],
  explanation: '智企推承接营销推广类业务；洗车服务属于好车服的业务范围。',
  proof: '文档智企推业务说明包含"银行分期推广、媒介投放、图文设计、保险精准营销、推广策划"。',
},
{
  id: 105,
  type: 'multiple',
  category: '业务场景',
  tags: ['好车服', '车生活'],
  difficulty: '进阶',
  stem: '好车服承接的车生活服务包括以下哪些？',
  options: [
    { label: 'A', text: '洗车服务' },
    { label: 'B', text: '代驾服务' },
    { label: 'C', text: '车险咨询' },
    { label: 'D', text: '媒介投放' },
  ],
  answer: ['A', 'B', 'C'],
  explanation: '好车服承接车生活服务；媒介投放属于智企推的业务范围。',
  proof: '文档好车服业务说明包含"汽车安全检测、洗车、代驾、车险咨询等车生活服务"。',
},
{
  id: 106,
  type: 'multiple',
  category: '收入归属',
  difficulty: '进阶',
  stem: '关于收入归属原则，以下说法正确的有哪些？',
  options: [
    { label: 'A', text: '业务使用哪个前端平台，收入就归哪个平台' },
    { label: 'B', text: '通用型产品的收入归属看产品名称，不看实际平台' },
    { label: 'C', text: '外部直发业务通过赢商城记录，收入归赢商城' },
    { label: 'D', text: '速度猫收入独立核算，不纳入三大核心平台' },
  ],
  answer: ['A', 'C', 'D'],
  explanation: 'B选项错误：通用型产品收入归属看实际发生的平台，不看产品名称。',
  proof: '文档4.2明确收入归属原则；速度猫章节说明收入独立核算。',
},
{
  id: 107,
  type: 'multiple',
  category: '系统配置',
  tags: ['卡控', '字段'],
  difficulty: '基础',
  stem: '卡控平台需要增加以下哪些关键字段？',
  options: [
    { label: 'A', text: '产品名称' },
    { label: 'B', text: '归属平台' },
    { label: 'C', text: '供应商名称' },
    { label: 'D', text: '合同编号' },
  ],
  answer: ['A', 'B'],
  explanation: '文档明确要求卡控平台增加"产品名称"和"归属平台"两个关键字段。',
  proof: '文档原句："卡控平台需要增加产品名称和归属平台字段。"',
},
{
  id: 108,
  type: 'multiple',
  category: '合同标注',
  difficulty: '基础',
  stem: '以下关于合同标注的要求，哪些是正确的？',
  options: [
    { label: 'A', text: '合同首页或显著位置必须标注产品名称' },
    { label: 'B', text: '结算单需要同步使用产品名称' },
    { label: 'C', text: '发票需要同步使用产品名称' },
    { label: 'D', text: '合同只需标注合同编号即可' },
  ],
  answer: ['A', 'B', 'C'],
  explanation: '合同必须标注产品名称，结算单和发票也要同步使用；D选项错误。',
  proof: '文档原句："合同首页或显著位置必须标注产品名称……结算单和发票等财务凭证也要同步使用产品名称。"',
},
{
  id: 109,
  type: 'multiple',
  category: '申报流程',
  difficulty: '进阶',
  stem: '新增业务申报流程中，以下哪些步骤是必须的？',
  options: [
    { label: 'A', text: '填写《新产品申报表》' },
    { label: 'B', text: '报数字产品部审批' },
    { label: 'C', text: '定义新产品后方可开展业务' },
    { label: 'D', text: '可以先开展业务，事后补填申报表' },
  ],
  answer: ['A', 'B', 'C'],
  explanation: '必须先申报审批、定义产品后才能开展业务；D选项错误。',
  proof: '文档原句："需填写《新产品申报表》，报数字产品部审批并定义新产品后，方可开展业务。"',
},
{
  id: 110,
  type: 'multiple',
  category: '培训监督',
  difficulty: '基础',
  stem: '关于规则的培训与监督，以下说法正确的有哪些？',
  options: [
    { label: 'A', text: '规则是新员工入职必修课' },
    { label: 'B', text: '现有员工需通过专项培训考核' },
    { label: 'C', text: '财务部每月抽查业务标注情况' },
    { label: 'D', text: '产品体系调整需经总经办批准' },
  ],
  answer: ['A', 'B', 'D'],
  explanation: 'C选项错误：财务部每季度抽查，不是每月。',
  proof: '文档原句："规则将作为新员工入职必修课，现有员工要通过专项培训考核"；"财务部每季度抽查"；"产品体系调整需经总经办批准"。',
},
```

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 3: 提交多选题数据**

```bash
git add src/data/exam.ts
git commit -m "feat: 添加多选题数据（10道）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 添加填空题数据

**Files:**
- Modify: `src/data/exam.ts` (在多选题数据后追加)

- [ ] **Step 1: 添加填空题数据**

在多选题数据后添加填空题数据（至少17道）：

```typescript
// ===== 填空题 =====
{
  id: 201,
  type: 'fillBlank',
  category: '平台定义',
  tags: ['卡控'],
  difficulty: '入门',
  stem: '卡控 AI 平台定位为公司底层数据中枢与业务中台，负责数据归集、流程协同、资源调度和____营销。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['互联网精准', '精准'] },
  ],
  answer: ['互联网精准'],
  explanation: '卡控平台负责互联网精准营销。',
  proof: '文档原句："卡控 AI 平台……负责全产品线的数据归集、流程协同、资源调度，互联网精准营销"。',
},
{
  id: 202,
  type: 'fillBlank',
  category: '平台定义',
  tags: ['星辰'],
  difficulty: '入门',
  stem: '星辰 AI 链 SAAS 平台主要负责____活动设计。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['前端', '银行活动配置', '活动'] },
  ],
  answer: ['前端'],
  explanation: '星辰平台主要负责前端活动设计。',
  proof: '文档原句："星辰 AI 链 SAAS 平台……主要负责前端活动设计"。',
},
{
  id: 203,
  type: 'fillBlank',
  category: '平台定义',
  tags: ['赢商城'],
  difficulty: '入门',
  stem: '赢商城是面向____、B2C、C2C、F2C 的电商平台。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['B2B'] },
  ],
  answer: ['B2B'],
  explanation: '赢商城覆盖 B2B、B2C、C2C、F2C 等交易模式。',
  proof: '文档原句："多模态赢商城平台……覆盖 B2B、B2C、C2C、F2C 等交易模式"。',
},
{
  id: 204,
  type: 'fillBlank',
  category: '产品归属',
  tags: ['慧商通'],
  difficulty: '基础',
  stem: '无论业务采用何种交易模式，赢商城平台统一使用____作为产品名称。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['慧商通'] },
  ],
  answer: ['慧商通'],
  explanation: '赢商城平台统一使用慧商通作为产品名称。',
  proof: '文档原句："无论业务采用 B2B、B2C、C2C、F2C 等何种交易模式，统一使用'慧商通'作为产品名称。"',
},
{
  id: 205,
  type: 'fillBlank',
  category: '产品归属',
  tags: ['智捷通', '数益达', '物销易'],
  difficulty: '基础',
  stem: '智捷通、____、物销易三个产品是通用型产品，可在卡控和星辰平台使用。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['数益达'] },
  ],
  answer: ['数益达'],
  explanation: '数益达是通用型产品之一。',
  proof: '文档"通用型产品（可归属多个平台）"中列出智捷通、数益达、物销易。',
},
{
  id: 206,
  type: 'fillBlank',
  category: '产品归属',
  tags: ['智企推', '好车服'],
  difficulty: '基础',
  stem: '卡控平台专属产品包括____和好车服。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['智企推'] },
  ],
  answer: ['智企推'],
  explanation: '智企推和好车服是卡控平台专属产品。',
  proof: '文档"卡控平台专属产品"部分明确列出智企推、好车服。',
},
{
  id: 207,
  type: 'fillBlank',
  category: '收入归属',
  difficulty: '基础',
  stem: '收入归属的核心原则是：业务使用哪个____平台，收入就归哪个平台。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['前端'] },
  ],
  answer: ['前端'],
  explanation: '业务使用哪个前端平台，收入就归哪个平台。',
  proof: '文档原句："业务使用哪个前端平台，收入即归该平台。"',
},
{
  id: 208,
  type: 'fillBlank',
  category: '收入归属',
  tags: ['外部直发'],
  difficulty: '进阶',
  stem: '外部直发业务通过____平台记录，产品名称使用慧商通。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['赢商城'] },
  ],
  answer: ['赢商城'],
  explanation: '外部直发业务通过赢商城记录。',
  proof: '文档对应关系："路径 C（外部直发）……赢商城平台……慧商通"。',
},
{
  id: 209,
  type: 'fillBlank',
  category: '分子公司',
  tags: ['速度猫', '闪充'],
  difficulty: '基础',
  stem: '速度猫共享充电平台对应的产品名称是____。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['闪充'] },
  ],
  answer: ['闪充'],
  explanation: '速度猫对应产品是闪充。',
  proof: '文档原句："速度猫……对应产品是闪充"。',
},
{
  id: 210,
  type: 'fillBlank',
  category: '申报流程',
  difficulty: '进阶',
  stem: '新增业务需填写《____》，报数字产品部审批并定义新产品后方可开展业务。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['新产品申报表'] },
  ],
  answer: ['新产品申报表'],
  explanation: '必须填写新产品申报表。',
  proof: '文档原句："需填写《新产品申报表》，报数字产品部审批并定义新产品后，方可开展业务。"',
},
{
  id: 211,
  type: 'fillBlank',
  category: '合同标注',
  difficulty: '基础',
  stem: '合同首页或显著位置必须标注____名称。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['产品'] },
  ],
  answer: ['产品'],
  explanation: '合同必须标注产品名称。',
  proof: '文档原句："合同首页或显著位置必须标注产品名称。"',
},
{
  id: 212,
  type: 'fillBlank',
  category: '系统配置',
  difficulty: '基础',
  stem: '卡控平台需要增加____和归属平台两个关键字段。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['产品名称'] },
  ],
  answer: ['产品名称'],
  explanation: '卡控平台需要增加产品名称字段。',
  proof: '文档原句："卡控平台需要增加产品名称和归属平台字段。"',
},
{
  id: 213,
  type: 'fillBlank',
  category: '数据归集',
  difficulty: '进阶',
  stem: '历史业务数据归集时，各部门要梳理____年至今所有合同、结算单、银行流水。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['2024'] },
  ],
  answer: ['2024'],
  explanation: '历史数据归集范围是2024年至今。',
  proof: '文档原句："各部门要梳理2024年至今所有合同、结算单、银行流水。"',
},
{
  id: 214,
  type: 'fillBlank',
  category: '培训监督',
  difficulty: '基础',
  stem: '财务部每____抽查业务标注情况。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['季度'] },
  ],
  answer: ['季度'],
  explanation: '财务部每季度抽查。',
  proof: '文档原句："财务部每季度抽查。"',
},
{
  id: 215,
  type: 'fillBlank',
  category: '规则调整',
  difficulty: '进阶',
  stem: '产品体系调整需经____批准。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['总经办'] },
  ],
  answer: ['总经办'],
  explanation: '产品体系调整需经总经办批准。',
  proof: '文档原句："产品体系调整需经总经办批准。"',
},
{
  id: 216,
  type: 'fillBlank',
  category: 'SOP手册',
  difficulty: '进阶',
  stem: '____需牵头制定SOP手册并下发执行。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['数字产品部'] },
  ],
  answer: ['数字产品部'],
  explanation: '数字产品部牵头制定SOP手册。',
  proof: '文档原句："数字产品部需牵头制定SOP手册并下发执行。"',
},
{
  id: 217,
  type: 'fillBlank',
  category: '规则生效',
  difficulty: '入门',
  stem: '本规则自发布之日起生效，最终解释权归____所有。',
  fillSlots: [
    { slotId: 1, placeholder: '____', keywords: ['总经办'] },
  ],
  answer: ['总经办'],
  explanation: '最终解释权归总经办。',
  proof: '文档原句："本规则自发布之日起生效，最终解释权归总经办所有。"',
},
```

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 3: 提交填空题数据**

```bash
git add src/data/exam.ts
git commit -m "feat: 添加填空题数据（17道）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 添加场景题数据

**Files:**
- Modify: `src/data/exam.ts` (在填空题数据后追加)

- [ ] **Step 1: 添加场景题数据**

在填空题数据后添加场景题数据（至少1道）：

```typescript
// ===== 场景题 =====
{
  id: 301,
  type: 'scenario',
  category: '综合场景',
  tags: ['微信立减金', '星辰', '智捷通'],
  difficulty: '进阶',
  stem: '场景综合题',
  scenarioDesc: '某银行开展微信立减金营销活动，通过星辰平台进行活动配置和前端设计，活动结束后由供应商直接发货给用户。银行客户在支付时可以使用立减金抵扣。',
  subQuestions: [
    {
      subId: 1,
      type: 'judge',
      stem: '该业务应判断为"智捷通 + 星辰"，收入归属星辰平台。',
      answer: true,
      explanation: '微信立减金属于快捷支付营销，对应智捷通；通过星辰平台配置则归星辰。',
      proof: '附件场景一："某银行微信立减金活动通过星辰平台配置后由供应商直发。产品名称：智捷通；归属平台：星辰；收入归属：星辰平台。"',
      score: 5,
    },
    {
      subId: 2,
      type: 'multiple',
      stem: '以下关于该业务场景的判断，哪些是正确的？',
      options: [
        { label: 'A', text: '产品名称是智捷通' },
        { label: 'B', text: '归属平台是星辰' },
        { label: 'C', text: '收入归属卡控平台' },
        { label: 'D', text: '这是通用型产品在星辰平台使用的典型案例' },
      ],
      answer: ['A', 'B', 'D'],
      explanation: 'C选项错误：收入应归属星辰平台，不是卡控。',
      proof: '智捷通是通用型产品，可在星辰平台使用；收入归实际使用的平台。',
      score: 5,
    },
    {
      subId: 3,
      type: 'fillBlank',
      stem: '该业务场景中，产品名称是____，归属平台是____。',
      fillSlots: [
        { slotId: 1, placeholder: '____', keywords: ['智捷通'] },
        { slotId: 2, placeholder: '____', keywords: ['星辰'] },
      ],
      answer: ['智捷通', '星辰'],
      explanation: '微信立减金活动对应智捷通，通过星辰平台配置则归星辰。',
      proof: '附件场景一明确说明产品名称为智捷通，归属平台为星辰。',
      score: 5,
    },
  ],
  answer: [],
  explanation: '场景题综合考察产品识别、平台归属和收入判断能力。',
  proof: '参考文档附件场景一及相关平台、产品定义。',
},
```

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 3: 提交场景题数据**

```bash
git add src/data/exam.ts
git commit -m "feat: 添加场景题数据（1道）

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 添加多维筛选标签数据

**Files:**
- Modify: `src/data/exam.ts` (在场景题数据后追加)

- [ ] **Step 1: 添加标签分类常量**

在场景题数据后添加多维标签分类：

```typescript
// ===== 多维分类标签 =====
export const categoryTags = {
  knowledge: [
    '平台定义',
    '产品归属',
    '收入归属',
    '系统配置',
    '合同标注',
    '申报流程',
    '数据归集',
    '培训监督',
    '规则生效',
    '规则调整',
    'SOP手册',
    '手工录入',
    '分子公司',
  ],
  scenario: [
    '微信立减金',
    '数字权益',
    '车生活服务',
    '保险营销',
    '外部直发',
    '企业福利采购',
  ],
  product: [
    '智捷通',
    '数益达',
    '物销易',
    '智企推',
    '好车服',
    '慧商通',
    '闪充',
  ],
  difficulty: [
    '入门',
    '基础',
    '进阶',
    '专家',
  ],
}
```

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 3: 提交标签数据**

```bash
git add src/data/exam.ts
git commit -m "feat: 添加多维分类标签常量

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 更新 examNotice 配置

**Files:**
- Modify: `src/data/exam.ts:44-54` (examNotice 对象)

- [ ] **Step 1: 更新 examNotice 配置**

修改 `examNotice` 对象以反映新题型：

```typescript
export const examNotice = {
  title: '卡赢科技产品体系命名规则考试',
  duration: '45 分钟',
  totalScore: 99,
  passScore: 85,
  questionTypes: ['单选题', '判断题', '填空题', '场景题'],
  sessions: [
    '第一场：2026 年 4 月 1 日 10:00',
    '第二场：2026 年 4 月 2 日 14:00',
  ],
}
```

- [ ] **Step 2: 运行类型检查验证**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 3: 提交配置更新**

```bash
git add src/data/exam.ts
git commit -m "feat: 更新 examNotice 配置反映新题型结构

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 练习页面 - 添加多维筛选器 UI

**Files:**
- Modify: `src/views/practice/index.vue`

- [ ] **Step 1: 导入标签数据**

在 `<script setup>` 顶部导入区域添加：

```typescript
import { categoryTags, defaultPracticeConfig } from '@/data/exam'
```

- [ ] **Step 2: 添加筛选状态变量**

在现有 `selectedCategory` 变量附近添加筛选状态：

```typescript
const selectedTypes = ref<QuestionType[]>([...(practiceStorage.value.selectedTypes || defaultPracticeConfig.selectedTypes)])
const selectedTags = ref<string[]>([...(practiceStorage.value.selectedTags || [])])
const selectedDifficulty = ref<string[]>([...(practiceStorage.value.selectedDifficulty || [])])
const showFilterPanel = ref(false)
```

- [ ] **Step 3: 扩展 practiceStorage 结构**

修改 `practiceStorage` 的默认值，添加新字段：

```typescript
const practiceStorage = useLocalStorage('cardwinner-practice-state', {
  category: '全部',
  currentIndex: 0,
  userAnswers: {} as Record<number, string | boolean | string[] | string[][]>,
  objectiveCompleted: {} as Record<number, boolean>,
  objectiveOrder: [] as number[],
  selectedTypes: defaultPracticeConfig.selectedTypes,
  selectedTags: [] as string[],
  selectedDifficulty: [] as string[],
})
```

- [ ] **Step 4: 添加筛选后的题目计算**

添加 `filteredByAllQuestions` 计算属性：

```typescript
const filteredByAllQuestions = computed(() => {
  let result = practiceQuestions

  // 按题型筛选
  if (selectedTypes.value.length > 0) {
    result = result.filter(q => selectedTypes.value.includes(q.type))
  }

  // 按分类筛选
  if (selectedCategory.value !== '全部') {
    result = result.filter(q => q.category === selectedCategory.value)
  }

  // 按标签筛选
  if (selectedTags.value.length > 0) {
    result = result.filter(q => q.tags && q.tags.some(tag => selectedTags.value.includes(tag)))
  }

  // 按难度筛选
  if (selectedDifficulty.value.length > 0) {
    result = result.filter(q => q.difficulty && selectedDifficulty.value.includes(q.difficulty))
  }

  return result
})
```

- [ ] **Step 5: 添加筛选器 UI 组件**

在练习模式的分类筛选区域后添加筛选器面板：

```vue
<section class="rounded-[20px] bg-[var(--color-block-background)] p-[16px] shadow-card">
  <div class="flex items-center justify-between">
    <div class="section-title">
      多维筛选
    </div>
    <van-button size="small" plain @click="showFilterPanel = !showFilterPanel">
      {{ showFilterPanel ? '收起' : '展开' }}
    </van-button>
  </div>

  <div v-if="showFilterPanel" class="mt-[12px] space-y-[12px]">
    <!-- 题型筛选 -->
    <div>
      <div class="text-[14px] font-bold mb-[8px]">题型</div>
      <div class="flex flex-wrap gap-[8px]">
        <button
          v-for="t in ['single', 'multiple', 'judge', 'fillBlank', 'scenario']"
          :key="t"
          type="button"
          class="filter-chip"
          :class="{ active: selectedTypes.includes(t) }"
          @click="toggleTypeFilter(t)"
        >
          {{ getTypeLabel(t) }}
        </button>
      </div>
    </div>

    <!-- 场景标签筛选 -->
    <div>
      <div class="text-[14px] font-bold mb-[8px]">场景标签</div>
      <div class="flex flex-wrap gap-[8px]">
        <button
          v-for="tag in categoryTags.scenario"
          :key="tag"
          type="button"
          class="filter-chip"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTagFilter(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 产品标签筛选 -->
    <div>
      <div class="text-[14px] font-bold mb-[8px]">产品标签</div>
      <div class="flex flex-wrap gap-[8px]">
        <button
          v-for="tag in categoryTags.product"
          :key="tag"
          type="button"
          class="filter-chip"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTagFilter(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 难度筛选 -->
    <div>
      <div class="text-[14px] font-bold mb-[8px]">难度</div>
      <div class="flex flex-wrap gap-[8px]">
        <button
          v-for="d in categoryTags.difficulty"
          :key="d"
          type="button"
          class="filter-chip"
          :class="{ active: selectedDifficulty.includes(d) }"
          @click="toggleDifficultyFilter(d)"
        >
          {{ d }}
        </button>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 6: 添加筛选辅助函数**

在 `<script setup>` 中添加筛选辅助函数：

```typescript
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

function toggleTagFilter(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

function toggleDifficultyFilter(diff: string) {
  const index = selectedDifficulty.value.indexOf(diff)
  if (index > -1) {
    selectedDifficulty.value.splice(index, 1)
  } else {
    selectedDifficulty.value.push(diff)
  }
}
```

- [ ] **Step 7: 添加筛选器样式**

在 `<style>` 部分添加筛选器样式：

```less
.filter-chip {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  background: var(--color-soft-card);
  color: var(--color-brand-deep);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.filter-chip.active {
  background: linear-gradient(135deg, #dcfce7, #dbeafe);
  border-color: #67e8f9;
  font-weight: 700;
}
```

- [ ] **Step 8: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 页面正常显示筛选器 UI

- [ ] **Step 9: 提交筛选器 UI**

```bash
git add src/views/practice/index.vue
git commit -m "feat: 练习页面添加多维筛选器 UI

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 练习页面 - 添加多选题 UI

**Files:**
- Modify: `src/views/practice/index.vue`

- [ ] **Step 1: 修改答案存储类型**

将 `userAnswers` 类型从 `Record<number, string | boolean>` 改为支持数组：

```typescript
const userAnswers = reactive<Record<number, string | boolean | string[] | string[][]>>({ ...(practiceStorage.value.userAnswers || {}) })
```

- [ ] **Step 2: 添加多选题渲染模板**

在题目渲染区域的 `<template v-if="currentPracticeObjective.type === 'single'">` 后添加多选题模板：

```vue
<template v-else-if="currentPracticeObjective.type === 'multiple'">
  <button
    v-for="option in currentPracticeObjective.options"
    :key="option.label"
    type="button"
    class="answer-card"
    :class="{ selected: (userAnswers[currentPracticeObjective.id] as string[])?.includes(option.label) }"
    @click="answerMultipleChoice(option.label)"
  >
    <span class="answer-label">{{ option.label }}</span>
    <span class="flex-1 text-left">{{ option.text }}</span>
    <span v-if="(userAnswers[currentPracticeObjective.id] as string[])?.includes(option.label)" class="check-icon">✓</span>
  </button>
  <div class="text-[13px] text-[var(--van-text-color-2)] mt-[8px]">
    已选 {{ (userAnswers[currentPracticeObjective.id] as string[])?.length || 0 }} 项
  </div>
</template>
```

- [ ] **Step 3: 添加多选题答案处理函数**

添加多选题点击处理函数：

```typescript
function answerMultipleChoice(label: string) {
  if (!currentPracticeObjective.value)
    return
  const current = (userAnswers[currentPracticeObjective.value.id] as string[]) || []
  const index = current.indexOf(label)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(label)
  }
  userAnswers[currentPracticeObjective.value.id] = [...current]
  practiceObjectiveCompleted[currentPracticeObjective.value.id] = false
}
```

- [ ] **Step 4: 修改答案解析显示逻辑**

修改答案解析区域的正确答案显示，支持多选题：

```vue
<div class="font-bold">
  正确答案：{{ formatAnswer(currentPracticeObjective) }}
</div>
```

添加 `formatAnswer` 函数：

```typescript
function formatAnswer(question: PracticeQuestion): string {
  if (question.type === 'multiple') {
    return (question.answer as string[]).join('、')
  }
  if (question.type === 'fillBlank') {
    return (question.answer as string[]).join(' / ')
  }
  if (question.type === 'judge') {
    return question.answer === true ? '正确' : '错误'
  }
  return question.answer as string
}
```

- [ ] **Step 5: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 多选题正常渲染和交互

- [ ] **Step 6: 提交多选题 UI**

```bash
git add src/views/practice/index.vue
git commit -m "feat: 练习页面添加多选题 UI

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 练习页面 - 添加填空题 UI

**Files:**
- Modify: `src/views/practice/index.vue`

- [ ] **Step 1: 添加填空题渲染模板**

在多选题模板后添加填空题模板：

```vue
<template v-else-if="currentPracticeObjective.type === 'fillBlank'">
  <div class="text-[16px] leading-[28px]">
    {{ renderFillBlankStem(currentPracticeObjective) }}
  </div>
  <div class="mt-[14px] space-y-[12px]">
    <div v-for="slot in currentPracticeObjective.fillSlots" :key="slot.slotId" class="fill-slot-item">
      <div class="text-[14px] text-[var(--van-text-color-2)] mb-[6px]">空位 {{ slot.slotId }}</div>
      <input
        type="text"
        class="fill-input"
        :placeholder="slot.placeholder"
        :value="(userAnswers[currentPracticeObjective.id] as string[])?.[slot.slotId - 1] || ''"
        @input="answerFillBlank(slot.slotId, $event)"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: 添加填空题辅助函数**

添加填空题题干渲染和答案处理函数：

```typescript
function renderFillBlankStem(question: PracticeQuestion): string {
  if (!question.fillSlots)
    return question.stem
  let stem = question.stem
  for (const slot of question.fillSlots) {
    stem = stem.replace(slot.placeholder, `[空${slot.slotId}]`)
  }
  return stem
}

function answerFillBlank(slotId: number, event: Event) {
  if (!currentPracticeObjective.value)
    return
  const input = event.target as HTMLInputElement
  const current = (userAnswers[currentPracticeObjective.value.id] as string[]) || []
  current[slotId - 1] = input.value.trim()
  userAnswers[currentPracticeObjective.value.id] = [...current]
  practiceObjectiveCompleted[currentPracticeObjective.value.id] = false
}
```

- [ ] **Step 3: 添加填空题样式**

添加填空题输入框样式：

```less
.fill-slot-item {
  padding: 12px;
  background: var(--color-soft-card);
  border-radius: 14px;
}

.fill-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 15px;
  background: #fff;

  &:focus {
    border-color: var(--color-brand);
    outline: none;
  }
}

.check-icon {
  color: #16a34a;
  font-weight: 700;
}
```

- [ ] **Step 4: 修改答案解析显示**

修改填空题答案解析，显示关键词匹配结果：

```vue
<div v-if="currentPracticeObjective.type === 'fillBlank' && practiceObjectiveCompleted[currentPracticeObjective.id]" class="analysis-box mt-[14px]">
  <div class="font-bold">填空答案解析</div>
  <div class="mt-[8px] space-y-[6px]">
    <div v-for="(slot, idx) in currentPracticeObjective.fillSlots" :key="slot.slotId" class="fill-result">
      <span class="fill-label">空位 {{ slot.slotId }}：</span>
      <span class="fill-keywords">关键词：{{ slot.keywords.join(' / ') }}</span>
      <span :class="checkFillKeyword(slot, (userAnswers[currentPracticeObjective.id] as string[])?.[idx]) ? 'fill-correct' : 'fill-wrong'">
        {{ checkFillKeyword(slot, (userAnswers[currentPracticeObjective.id] as string[])?.[idx]) ? '匹配' : '未匹配' }}
      </span>
    </div>
  </div>
  <div class="proof-box mt-[10px]">
    <div class="font-bold">原句依据</div>
    <div class="mt-[4px] text-[14px] leading-[24px]">{{ currentPracticeObjective.proof }}</div>
  </div>
</div>
```

添加关键词匹配函数：

```typescript
function checkFillKeyword(slot: FillBlankSlot, userAnswer: string): boolean {
  if (!userAnswer)
    return false
  return slot.keywords.some(kw => userAnswer.toLowerCase().includes(kw.toLowerCase()))
}
```

- [ ] **Step 5: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 填空题正常渲染和交互

- [ ] **Step 6: 提交填空题 UI**

```bash
git add src/views/practice/index.vue
git commit -m "feat: 练习页面添加填空题 UI

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 练习页面 - 添加场景题 UI

**Files:**
- Modify: `src/views/practice/index.vue`

- [ ] **Step 1: 添加场景题渲染模板**

在填空题模板后添加场景题模板：

```vue
<template v-else-if="currentPracticeObjective.type === 'scenario'">
  <!-- 场景描述 -->
  <div class="scenario-desc-box">
    <div class="text-[14px] text-[var(--van-text-color-2)] mb-[6px]">场景描述</div>
    <div class="text-[16px] leading-[26px] text-[var(--color-brand-deep)]">
      {{ currentPracticeObjective.scenarioDesc }}
    </div>
  </div>

  <!-- 子题列表 -->
  <div class="mt-[16px] space-y-[14px]">
    <div v-for="sub in currentPracticeObjective.subQuestions" :key="sub.subId" class="sub-question-box">
      <div class="flex items-center justify-between text-[13px] text-[var(--van-text-color-2)]">
        <span>子题 {{ sub.subId }}（{{ getTypeLabel(sub.type) }}）</span>
        <span class="sub-score">{{ sub.score }} 分</span>
      </div>

      <div class="text-[16px] leading-[26px] font-bold mt-[8px] text-[var(--color-brand-deep)]">
        {{ sub.stem }}
      </div>

      <!-- 判断子题 -->
      <template v-if="sub.type === 'judge'">
        <div class="mt-[10px] flex gap-[10px]">
          <button
            type="button"
            class="answer-card"
            :class="{ selected: (userAnswers[currentPracticeObjective.id] as any)?.[sub.subId] === true }"
            @click="answerScenarioSub(currentPracticeObjective.id, sub.subId, true)"
          >
            <span class="answer-label">A</span>
            <span>正确</span>
          </button>
          <button
            type="button"
            class="answer-card"
            :class="{ selected: (userAnswers[currentPracticeObjective.id] as any)?.[sub.subId] === false }"
            @click="answerScenarioSub(currentPracticeObjective.id, sub.subId, false)"
          >
            <span class="answer-label">B</span>
            <span>错误</span>
          </button>
        </div>
      </template>

      <!-- 多选子题 -->
      <template v-if="sub.type === 'multiple'">
        <div class="mt-[10px] space-y-[8px]">
          <button
            v-for="opt in sub.options"
            :key="opt.label"
            type="button"
            class="answer-card"
            :class="{ selected: ((userAnswers[currentPracticeObjective.id] as any)?.[sub.subId] as string[])?.includes(opt.label) }"
            @click="answerScenarioMultiple(currentPracticeObjective.id, sub.subId, opt.label)"
          >
            <span class="answer-label">{{ opt.label }}</span>
            <span class="flex-1 text-left">{{ opt.text }}</span>
          </button>
        </div>
      </template>

      <!-- 填空子题 -->
      <template v-if="sub.type === 'fillBlank'">
        <div class="mt-[10px] space-y-[8px]">
          <div v-for="(fs, fIdx) in sub.fillSlots" :key="fs.slotId" class="fill-slot-item">
            <input
              type="text"
              class="fill-input"
              :placeholder="fs.placeholder"
              :value="((userAnswers[currentPracticeObjective.id] as any)?.[sub.subId] as string[])?.[fIdx] || ''"
              @input="answerScenarioFillBlank(currentPracticeObjective.id, sub.subId, fIdx, $event)"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 添加场景题答案处理函数**

添加场景题答案处理函数：

```typescript
function answerScenarioSub(questionId: number, subId: number, value: boolean) {
  const current = (userAnswers[questionId] as Record<number, any>) || {}
  current[subId] = value
  userAnswers[questionId] = { ...current }
  practiceObjectiveCompleted[questionId] = false
}

function answerScenarioMultiple(questionId: number, subId: number, label: string) {
  const current = (userAnswers[questionId] as Record<number, any>) || {}
  const subAnswers = (current[subId] as string[]) || []
  const index = subAnswers.indexOf(label)
  if (index > -1) {
    subAnswers.splice(index, 1)
  } else {
    subAnswers.push(label)
  }
  current[subId] = [...subAnswers]
  userAnswers[questionId] = { ...current }
  practiceObjectiveCompleted[questionId] = false
}

function answerScenarioFillBlank(questionId: number, subId: number, slotIndex: number, event: Event) {
  const input = event.target as HTMLInputElement
  const current = (userAnswers[questionId] as Record<number, any>) || {}
  const subAnswers = (current[subId] as string[]) || []
  subAnswers[slotIndex] = input.value.trim()
  current[subId] = [...subAnswers]
  userAnswers[questionId] = { ...current }
  practiceObjectiveCompleted[questionId] = false
}
```

- [ ] **Step 3: 添加场景题样式**

添加场景题样式：

```less
.scenario-desc-box {
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 16px;
}

.sub-question-box {
  padding: 14px;
  background: var(--color-soft-card);
  border-radius: 14px;
  border: 1px solid var(--color-border);
}

.sub-score {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 12px;
}

.fill-result {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.fill-label {
  font-weight: 700;
}

.fill-keywords {
  color: var(--van-text-color-2);
}

.fill-correct {
  color: #16a34a;
  font-weight: 700;
}

.fill-wrong {
  color: #dc2626;
  font-weight: 700;
}
```

- [ ] **Step 4: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 场景题正常渲染和交互

- [ ] **Step 5: 提交场景题 UI**

```bash
git add src/views/practice/index.vue
git commit -m "feat: 练习页面添加场景题 UI

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: 模拟考试页面 - 适配新题型

**Files:**
- Modify: `src/views/mock-exam/index.vue`

- [ ] **Step 1: 导入新数据和类型**

修改导入语句：

```typescript
import type { PracticeQuestion, FillBlankSlot, ExamPaperConfig } from '@/data/exam'
import { practiceQuestions, defaultExamConfig, categoryTags } from '@/data/exam'
```

- [ ] **Step 2: 修改试卷组卷逻辑**

修改 `OBJECTIVE_COUNT` 和组卷逻辑，按试卷配置抽取题目：

```typescript
const examConfig = defaultExamConfig

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

  return shuffleArray(selectedQuestions)
}
```

- [ ] **Step 3: 修改答案存储类型**

将 `objectiveAnswers` 类型改为支持多选和填空：

```typescript
const objectiveAnswers = reactive<Record<number, string | boolean | string[] | string[][] | Record<number, any>>>({})
```

- [ ] **Step 4: 添加多选题 UI**

在考试题目渲染区域添加多选题模板（与练习页面类似）：

```vue
<template v-else-if="question.type === 'multiple'">
  <button
    v-for="option in question.options"
    :key="option.label"
    type="button"
    class="answer-card"
    :disabled="submitted"
    :class="{
      selected: (objectiveAnswers[question.id] as string[])?.includes(option.label),
      correct: submitted && (question.answer as string[])?.includes(option.label),
      incorrect: submitted && (objectiveAnswers[question.id] as string[])?.includes(option.label) && !(question.answer as string[])?.includes(option.label),
    }"
    @click="answerExamMultiple(question.id, option.label)"
  >
    <span class="answer-label">{{ option.label }}</span>
    <span>{{ option.text }}</span>
  </button>
</template>
```

添加多选题答案处理函数：

```typescript
function answerExamMultiple(questionId: number, label: string) {
  if (submitted.value)
    return
  const current = (objectiveAnswers[questionId] as string[]) || []
  const index = current.indexOf(label)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(label)
  }
  objectiveAnswers[questionId] = [...current]
}
```

- [ ] **Step 5: 添加填空题 UI**

添加填空题模板：

```vue
<template v-else-if="question.type === 'fillBlank'">
  <div class="text-[16px] leading-[28px]">
    {{ renderFillBlankStem(question) }}
  </div>
  <div class="mt-[14px] space-y-[12px]">
    <div v-for="slot in question.fillSlots" :key="slot.slotId" class="fill-slot-item">
      <input
        type="text"
        class="fill-input"
        :disabled="submitted"
        :placeholder="slot.placeholder"
        :value="(objectiveAnswers[question.id] as string[])?.[slot.slotId - 1] || ''"
        @input="answerExamFillBlank(question.id, slot.slotId, $event)"
      />
    </div>
  </div>
</template>
```

添加填空题答案处理函数：

```typescript
function answerExamFillBlank(questionId: number, slotId: number, event: Event) {
  if (submitted.value)
    return
  const input = event.target as HTMLInputElement
  const current = (objectiveAnswers[questionId] as string[]) || []
  current[slotId - 1] = input.value.trim()
  objectiveAnswers[questionId] = [...current]
}
```

- [ ] **Step 6: 添加场景题 UI**

添加场景题模板（与练习页面类似，增加评分显示）：

```vue
<template v-else-if="question.type === 'scenario'">
  <div class="scenario-desc-box">
    <div class="text-[14px] text-[var(--van-text-color-2)]">场景描述</div>
    <div class="text-[16px] leading-[26px] mt-[6px]">{{ question.scenarioDesc }}</div>
  </div>
  <div class="mt-[16px] space-y-[14px]">
    <div v-for="sub in question.subQuestions" :key="sub.subId" class="sub-question-box">
      <!-- 子题渲染，与练习页面类似 -->
    </div>
  </div>
</template>
```

- [ ] **Step 7: 修改评分逻辑**

修改评分计算逻辑，支持新题型：

```typescript
const scoreBreakdown = computed(() => {
  let total = 0
  for (const section of examConfig.sections) {
    const sectionQuestions = objectiveQuestions.value.filter(q => q.type === section.type)
    let sectionScore = 0
    for (const q of sectionQuestions) {
      const userAnswer = objectiveAnswers[q.id]
      if (q.type === 'single' || q.type === 'judge') {
        if (userAnswer === q.answer)
          sectionScore += section.scorePerQuestion
      } else if (q.type === 'multiple') {
        const correct = q.answer as string[]
        const user = (userAnswer as string[]) || []
        if (arraysEqual(correct.sort(), user.sort()))
          sectionScore += section.scorePerQuestion
      } else if (q.type === 'fillBlank') {
        const slots = q.fillSlots || []
        const user = (userAnswer as string[]) || []
        let slotScore = 0
        for (let i = 0; i < slots.length; i++) {
          if (slots[i].keywords.some(kw => (user[i] || '').toLowerCase().includes(kw.toLowerCase())))
            slotScore += section.scorePerQuestion / slots.length
        }
        sectionScore += Math.round(slotScore)
      } else if (q.type === 'scenario') {
        const subQuestions = q.subQuestions || []
        const user = (userAnswer as Record<number, any>) || {}
        for (const sub of subQuestions) {
          const subAnswer = user[sub.subId]
          if (sub.type === 'judge' && subAnswer === sub.answer)
            sectionScore += sub.score
          else if (sub.type === 'multiple' && arraysEqual((sub.answer as string[]).sort(), ((subAnswer as string[]) || []).sort()))
            sectionScore += sub.score
          else if (sub.type === 'fillBlank') {
            const slots = sub.fillSlots || []
            const fillAnswers = (subAnswer as string[]) || []
            let fillScore = 0
            for (let i = 0; i < slots.length; i++) {
              if (slots[i].keywords.some(kw => (fillAnswers[i] || '').toLowerCase().includes(kw.toLowerCase())))
                fillScore += sub.score / slots.length
            }
            sectionScore += Math.round(fillScore)
          }
        }
      }
    }
    total += sectionScore
  }
  return { total }
})

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every(v => b.includes(v))
}
```

- [ ] **Step 8: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 模拟考试页面正常显示新题型

- [ ] **Step 9: 提交模拟考试适配**

```bash
git add src/views/mock-exam/index.vue
git commit -m "feat: 模拟考试页面适配新题型和评分逻辑

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: 更新首页考试说明

**Files:**
- Modify: `src/views/home/index.vue`

- [ ] **Step 1: 更新考试信息显示**

修改首页的考试信息卡片，使用新的 `examNotice` 配置：

确保导入并使用更新后的 examNotice 数据。

- [ ] **Step 2: 运行开发服务器验证**

Run: `pnpm dev`
Expected: 首页显示正确的题型信息

- [ ] **Step 3: 提交首页更新**

```bash
git add src/views/home/index.vue
git commit -m "feat: 更新首页考试说明信息

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: 类型检查和构建验证

**Files:**
- 全项目

- [ ] **Step 1: 运行完整类型检查**

Run: `pnpm type-check`
Expected: 无类型错误

- [ ] **Step 2: 运行构建**

Run: `pnpm build`
Expected: 构建成功，无错误

- [ ] **Step 3: 运行预览验证**

Run: `pnpm preview`
Expected: 预览服务器正常启动

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: 完成考试系统题型扩展（多选、填空、场景题）

- 扩展 QuestionType 支持五种题型
- 新增多选题、填空题、场景题数据
- 练习页面支持多维筛选和新题型 UI
- 模拟考试页面适配新题型和评分逻辑

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 自检清单

**1. Spec coverage 检查：**
- ✅ 数据类型设计 → Task 1
- ✅ 多选题数据 → Task 2
- ✅ 填空题数据 → Task 3
- ✅ 场景题数据 → Task 4
- ✅ 多维标签数据 → Task 5
- ✅ 试卷配置 → Task 6
- ✅ 多维筛选器 UI → Task 7
- ✅ 多选题 UI → Task 8
- ✅ 填空题 UI → Task 9
- ✅ 场景题 UI → Task 10
- ✅ 模拟考试适配 → Task 11
- ✅ 首页更新 → Task 12
- ✅ 构建验证 → Task 13

**2. Placeholder scan：无 TBD、TODO、未完成步骤**

**3. Type consistency：类型定义在各 Task 中保持一致**