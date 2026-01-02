import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '@/lib/env';

// Schema for the daily data sent from frontend
const echoRequestSchema = z.object({
  date: z.string(),
  dayOverall: z.enum(['good', 'fair', 'bad']),
  dinnerAmount: z.enum(['light', 'medium', 'heavy']).optional(), // Optional in case defaults vary
  note: z.string().optional(),
  eventLogs: z.array(z.object({
    type: z.string(),
    name: z.string(),
    time: z.string().optional(),
  })).optional().default([]),
  phaseInfo: z.string().optional(),
  recentLogs: z.array(z.object({
    date: z.string(),
    dayOverall: z.enum(['good', 'fair', 'bad']).optional(),
    note: z.string().optional(),
  })).optional().default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = echoRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Format History
    const historyText = data.recentLogs.length > 0 
      ? data.recentLogs.map(log => 
          `- ${log.date}: 調子=${log.dayOverall || '不明'}, メモ=${log.note || 'なし'}`
        ).join('\n')
      : '過去の記録なし';

    // Current Day Data
    const medsCount = data.eventLogs.filter(e => e.type === 'medicine').length;
    const symptoms = Array.from(new Set(data.eventLogs.filter(e => e.type === 'symptom').map(e => e.name))).join(', ');
    
    const prompt = `
あなたはユーザーの体調管理に寄り添うAIパートナーです。
これまでの経過学習し、今日の記録と照らし合わせてユーザーへの「Echo（振り返りサマリー）」を作成してください。
単に今日のことを言うだけでなく、「昨日より良くなりましたね」や「これまでの不調から回復傾向です」のように、**文脈（コンテキスト）を踏まえた言葉**をかけてください。

【直近の記録（学習データ）】
${historyText}

【今日の記録】
- 日付: ${data.date}
- フェーズ: ${data.phaseInfo || 'なし'}
- 今日の調子: ${data.dayOverall === 'good' ? '良い' : data.dayOverall === 'bad' ? '不調' : '普通'}
- 症状: ${symptoms || '特になし'}
- 頓服薬の使用: ${medsCount}回
- フリーメモ: ${data.note || 'なし'}

【作成ルール】
1. **短く簡潔に**: 2〜3文（最大80文字程度）。
2. **比較と傾向**: 過去データがある場合は、それと比較して（良くなった、維持している、少し休んだ方がいい等）言及する。
3. **共感**: 上から目線にならず、隣で歩くパートナーとして話す。
4. **トーン**: 丁寧語（です/ます）。

例1（回復傾向）:
「昨日の不調から少し持ち直したようで安心しました。このまま穏やかに過ごせると良いですね。」
例2（不調続き）:
「連日辛い日が続いていますね。無理をせず、今日は早めに休んでエネルギーを蓄えましょう。」
    `.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ echo: text });

  } catch (error: any) {
    console.error('Echo API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
