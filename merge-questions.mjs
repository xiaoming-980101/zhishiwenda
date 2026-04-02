import fs from 'fs';

// 读取 exam.ts 内容
const examContent = fs.readFileSync('src/data/exam.ts', 'utf-8');

// 读取 tm1.json
const tm1Data = JSON.parse(fs.readFileSync('tm1.json', 'utf-8'));

// 提取 exam.ts 中所有题目的 stem（题干）用于去重
const examStems = [];
const stemRegex = /stem:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = stemRegex.exec(examContent)) !== null) {
  examStems.push(match[1].trim());
}

console.log(`exam.ts 中已有题目数量: ${examStems.length}`);

// 找出 tm1.json 中独有的题目（基于 stem 去重）
const uniqueQuestions = [];
const seenStems = new Set(examStems);

for (const q of tm1Data) {
  if (!seenStems.has(q.stem)) {
    uniqueQuestions.push(q);
    seenStems.add(q.stem);
  }
}

console.log(`tm1.json 中独有题目数量: ${uniqueQuestions.length}`);

if (uniqueQuestions.length === 0) {
  console.log('没有新题目需要添加');
  process.exit(0);
}

// 为新题目分配 ID（从 401 开始）
let newId = 401;
const questionsWithNewIds = uniqueQuestions.map(q => {
  const newQ = { ...q, id: newId++ };
  // 如果是场景题，重新分配 subId
  if (q.subQuestions) {
    let subId = 1;
    newQ.subQuestions = q.subQuestions.map(sq => ({ ...sq, subId: subId++ }));
  }
  return newQ;
});

// 生成要追加的代码
const generateQuestionCode = (q) => {
  const typeMap = {
    'single': 'single',
    'multiple': 'multiple',
    'judge': 'judge',
    'fillBlank': 'fillBlank',
    'scenario': 'scenario'
  };

  const type = typeMap[q.type] || q.type;
  const tags = q.tags ? q.tags.map(t => `'${t}'`).join(', ') : '';

  let code = `  {\n`;
  code += `    id: ${q.id},\n`;
  code += `    type: '${type}',\n`;
  code += `    category: '${q.category}',\n`;
  if (tags) code += `    tags: [${tags}],\n`;
  if (q.difficulty) code += `    difficulty: '${q.difficulty}',\n`;
  code += `    stem: '${q.stem.replace(/'/g, "\\'")}',\n`;

  // options
  if (q.options) {
    code += `    options: [\n`;
    for (const opt of q.options) {
      code += `      { label: '${opt.label}', text: '${opt.text.replace(/'/g, "\\'")}' },\n`;
    }
    code += `    ],\n`;
  }

  // fillSlots
  if (q.fillSlots) {
    code += `    fillSlots: [\n`;
    for (const slot of q.fillSlots) {
      const keywords = slot.keywords.map(k => `'${k}'`).join(', ');
      code += `      { slotId: ${slot.slotId}, placeholder: '${slot.placeholder}', keywords: [${keywords}] },\n`;
    }
    code += `    ],\n`;
  }

  // scenarioDesc
  if (q.scenarioDesc) {
    code += `    scenarioDesc: '${q.scenarioDesc.replace(/'/g, "\\'")}',\n`;
  }

  // subQuestions
  if (q.subQuestions) {
    code += `    subQuestions: [\n`;
    for (const sq of q.subQuestions) {
      code += `      {\n`;
      code += `        subId: ${sq.subId},\n`;
      code += `        type: '${sq.type}',\n`;
      code += `        stem: '${sq.stem.replace(/'/g, "\\'")}',\n`;

      if (sq.options) {
        code += `        options: [\n`;
        for (const opt of sq.options) {
          code += `          { label: '${opt.label}', text: '${opt.text.replace(/'/g, "\\'")}' },\n`;
        }
        code += `        ],\n`;
      }

      if (sq.fillSlots) {
        code += `        fillSlots: [\n`;
        for (const slot of sq.fillSlots) {
          const keywords = slot.keywords.map(k => `'${k}'`).join(', ');
          code += `          { slotId: ${slot.slotId}, placeholder: '${slot.placeholder}', keywords: [${keywords}] },\n`;
        }
        code += `        ],\n`;
      }

      // answer
      if (Array.isArray(sq.answer)) {
        const ans = sq.answer.map(a => `'${a}'`).join(', ');
        code += `        answer: [${ans}],\n`;
      } else if (typeof sq.answer === 'boolean') {
        code += `        answer: ${sq.answer},\n`;
      } else {
        code += `        answer: '${sq.answer}',\n`;
      }

      code += `        explanation: '${sq.explanation.replace(/'/g, "\\'")}',\n`;
      code += `        proof: '${sq.proof.replace(/'/g, "\\'")}',\n`;
      code += `        score: ${sq.score},\n`;
      code += `      },\n`;
    }
    code += `    ],\n`;
  }

  // answer
  if (q.subQuestions) {
    code += `    answer: [],\n`;
  } else if (Array.isArray(q.answer)) {
    const ans = q.answer.map(a => `'${a}'`).join(', ');
    code += `    answer: [${ans}],\n`;
  } else if (typeof q.answer === 'boolean') {
    code += `    answer: ${q.answer},\n`;
  } else {
    code += `    answer: '${q.answer}',\n`;
  }

  code += `    explanation: '${q.explanation.replace(/'/g, "\\'")}',\n`;
  code += `    proof: '${q.proof.replace(/'/g, "\\'")}',\n`;
  code += `  },\n`;

  return code;
};

// 生成所有新题目的代码
const newQuestionsCode = questionsWithNewIds.map(generateQuestionCode).join('\n');

// 找到 practiceQuestions 数组的结束位置（最后一个 ]; 之前）
const insertMarker = '// ===== 场景题 =====';
const insertPos = examContent.lastIndexOf(insertMarker);

if (insertPos === -1) {
  console.log('未找到插入位置');
  process.exit(1);
}

// 在最后一个场景题之后插入新题目
const lastScenarioEnd = examContent.lastIndexOf('},', examContent.indexOf('];', insertPos));

const beforeInsert = examContent.substring(0, lastScenarioEnd + 2);
const afterInsert = examContent.substring(lastScenarioEnd + 2);

const output = beforeInsert + '\n  // ===== 从 tm1.json 追加的新题目 =====\n' + newQuestionsCode + afterInsert;

fs.writeFileSync('src/data/exam.ts', output);
console.log(`成功追加 ${questionsWithNewIds.length} 道新题目`);

// 输出添加的题目列表
console.log('\n添加的题目：');
questionsWithNewIds.forEach(q => {
  console.log(`  ID ${q.id}: [${q.type}] ${q.stem.substring(0, 40)}...`);
});
