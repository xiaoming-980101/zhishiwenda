# 卡赢考试系统题型扩展设计文档

生成时间：2026-03-31

## 概述

本设计文档描述卡赢考试系统的题型扩展方案，新增多选题、填空题、场景题，并支持题目难度标签和多维分类筛选。

## 需求总结

### 考试试卷结构

| 题型 | 数量 | 每题分值 | 总分 |
|------|------|---------|------|
| 单选题 | 10道 | 3分 | 30分 |
| 判断题 | 10道 | 2分 | 20分 |
| 填空题 | 17道 | 2分 | 34分 |
| 场景题 | 1道 | 15分 | 15分 |
| **总计** | **38道** | - | **99分** |

场景题结构：场景描述 + 3个子题（判断5分 + 多选5分 + 填空5分）。

### 练习模式

- 有默认题型比例配置
- 用户可自由调整题型、数量、分类、标签、难度筛选

### 题目增强

- 难度标签：自定义名称（入门、基础、进阶、专家）
- 多维分类：知识点分类、场景标签、产品标签

---

## 第一部分：数据类型设计

### 题型定义

```typescript
// 题型扩展
export type QuestionType = 'single' | 'multiple' | 'judge' | 'fillBlank' | 'scenario'

// 题目难度（自定义标签）
export type DifficultyLevel = string  // 如 '入门'、'基础'、'进阶'、'专家'
```

### 核心接口

```typescript
// 多选题选项（复用现有）
export interface QuestionOption {
  label: string
  text: string
}

// 填空题空位定义
export interface FillBlankSlot {
  slotId: number           // 空位编号
  placeholder: string      // 显示占位符，如 "____"
  keywords: string[]       // 关键词列表（任一匹配即正确）
}

// 场景题子题
export interface ScenarioSubQuestion {
  subId: number
  type: 'judge' | 'multiple' | 'fillBlank'
  stem: string
  options?: QuestionOption[]       // 多选题用
  fillSlots?: FillBlankSlot[]      // 填空题用
  answer: string[] | boolean | string | string[][]   // 多选答案数组、判断布尔、填空关键词（单空:string 或 多空:string[]）
  explanation: string
  proof: string
  score: number                    // 子题分值
}

// 统一题目接口
export interface PracticeQuestion {
  id: number
  type: QuestionType
  category: string                 // 主分类
  tags?: string[]                  // 多维标签（场景标签、产品标签等）
  difficulty?: DifficultyLevel     // 难度标签
  stem: string
  options?: QuestionOption[]       // 单选/多选用
  fillSlots?: FillBlankSlot[]      // 填空题用
  scenarioDesc?: string            // 场景题描述
  subQuestions?: ScenarioSubQuestion[]  // 场景题子题
  answer: string | string[] | boolean | FillBlankSlot[]  // 根据题型不同
  explanation: string
  proof: string
}
```

---

## 第二部分：试卷结构配置

### 考试配置接口

```typescript
// 考试试卷配置
export interface ExamPaperConfig {
  title: string
  durationMinutes: number
  totalScore: number
  passScore: number
  sections: ExamSection[]
}

// 试卷分节
export interface ExamSection {
  type: 'single' | 'multiple' | 'judge' | 'fillBlank' | 'scenario'
  title: string           // 如 "单选题"、"判断题"
  questionCount: number   // 题目数量
  scorePerQuestion: number // 每题分值
  totalScore: number      // 本节总分
}

// 默认考试配置
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
```

### 练习配置接口

```typescript
// 练习模式配置（可调）
export interface PracticeConfig {
  selectedTypes: QuestionType[]   // 用户选择的题型
  selectedCategories: string[]    // 用户选择的分类
  selectedTags: string[]          // 用户选择的标签
  selectedDifficulty: string[]    // 用户选择的难度
  questionCount: number           // 题目数量
}

// 默认练习配置
export const defaultPracticeConfig: PracticeConfig = {
  selectedTypes: ['single', 'judge', 'fillBlank', 'scenario'],
  selectedCategories: ['全部'],
  selectedTags: [],
  selectedDifficulty: [],
  questionCount: 20,
}
```

---

## 第三部分：UI 组件设计

### 多选题 UI

- 选项卡片支持多选（点击切换选中/取消）
- 已选选项显示勾选标记
- 显示"已选 X 项"提示
- 交卷后显示正确答案（多选项高亮）

### 填空题 UI

- 题干中空位显示为 `[空1]`、`[空2]` 等占位符
- 每个空位下方有输入框
- 输入框支持实时校验提示
- 交卷后显示关键词匹配结果

### 场景题 UI

- 先显示场景描述区域（独立卡片，背景色区分）
- 然后依次显示 3 个子题（判断、多选、填空）
- 子题紧凑排列，共享场景上下文
- 场景题整体评分，显示子题得分明细

### 多维筛选器 UI

- 练习页面增加筛选面板
- 三个筛选维度：知识点分类、业务场景标签、产品标签
- 筛选器采用折叠式设计
- 支持多选组合筛选

---

## 第四部分：题目数据规划

### 题库储备要求

| 题型 | 考试数量 | 题库储备 | 知识点覆盖 |
|------|---------|---------|-----------|
| 单选题 | 10道 | ≥30道 | 平台定义、产品归属、收入归属、业务场景 |
| 判断题 | 10道 | ≥30道 | 系统配置、合同标注、申报流程、规则生效 |
| 填空题 | 17道 | ≥50道 | 平台职责、产品名称、核心原则、关键流程 |
| 场景题 | 1道 | ≥5道 | 综合业务场景（微信立减金、数字权益、车生活等） |

### 难度分布建议

- 入门：20%（基础概念）
- 基础：40%（核心规则）
- 进阶：30%（场景应用）
- 专家：10%（综合判断）

### 多维分类标签

**知识点分类**（主分类）：

- 平台定义、产品归属、收入归属、系统配置、合同标注、申报流程、数据归集、培训监督、规则生效、规则调整、SOP手册、手工录入、分子公司

**场景标签**：

- 微信立减金、数字权益、车生活服务、保险营销、外部直发、企业福利采购

**产品标签**：

- 智捷通、数益达、物销易、智企推、好车服、慧商通、闪充

---

## 第五部分：评分逻辑设计

### 单选题评分

- 用户答案 === 正确答案 → 得满分
- 否则 → 0分

### 多选题评分

- 用户答案数组完全匹配正确答案数组 → 得满分
- 否则 → 0分（不支持部分得分）

### 判断题评分

- 用户答案 === 正确答案 → 得满分
- 否则 → 0分

### 填空题评分

- 每个空位独立评分
- 用户输入包含该空位任一关键词 → 该空位得分
- 总分 = 各空位得分之和（支持部分得分）

### 场景题评分

- 场景题总分 15分 = 3个子题各5分
- 子题按各自题型规则评分
- 显示场景题总分 + 各子题得分明细

### 试卷总分计算

```typescript
function calculateTotalScore(answers, questions, config) {
  let total = 0
  for (const section of config.sections) {
    const sectionQuestions = questions.filter(q => q.type === section.type)
    const sectionScore = calculateSectionScore(answers, sectionQuestions, section.scorePerQuestion)
    total += sectionScore
  }
  return total
}
```

---

## 实现方案

采用**最小改动方案**：在现有架构上扩展，复用已有代码。

### 关键改动点

1. `src/data/exam.ts`：扩展类型定义，添加新题型数据
2. `src/views/practice/index.vue`：新增多选题、填空题、场景题 UI，增加多维筛选器
3. `src/views/mock-exam/index.vue`：适配新题型和评分逻辑

### 向后兼容

- 现有单选题、判断题数据结构和 UI 保持不变
- 新增题型通过可选字段实现，不影响旧数据

---

## 验收标准

1. 考试模式支持单选10道、判断10道、填空17道、场景1道
2. 练习模式支持题型、分类、标签、难度筛选
3. 多选题、填空题、场景题 UI 正常渲染
4. 评分逻辑正确，支持部分得分（填空题）
5. 题库数据储备达标（单选≥30、判断≥30、填空≥50、场景≥5）