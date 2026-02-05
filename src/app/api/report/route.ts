import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '@/lib/env';

// Schema for doctor report generation
const reportRequestSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  dayLogs: z.array(z.object({
    date: z.string(),
    dayOverall: z.string().optional(),
    sleepQuality: z.number().optional(),
    napDuration: z.number().optional(),
    migraineProdrome: z.number().optional(),
    fatigueLevel: z.number().optional(),
    note: z.string().optional(),
    echoSummary: z.string().optional(),
  })),
  symptoms: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  medications: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  phaseInfo: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = reportRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const logsText = data.dayLogs
      .map(log => 
        `- ${log.date}: 調子=${log.dayOverall || '-'}, 睡眠質=${log.sleepQuality || '-'}, 昼寝=${log.napDuration ? log.napDuration + '分' : 'なし'}, 予兆=${log.migraineProdrome || '0'}, 疲労感=${log.fatigueLevel || '0'}, AI反響=${log.echoSummary || 'なし'}, メモ=${log.note || 'なし'}`
      ).join('\n');

    const symptomsText = data.symptoms.map(s => `${s.name}(${s.count}回)`).join(', ');
    const medsText = data.medications.map(m => `${m.name}(${m.count}回)`).join(', ');

    const prompt = `
あなたは精神科医のアシスタントです。
患者（ユーザー）の期間内の記録をもとに、担当医に提出する**「経過所見（Clinical Observation）」**を作成してください。
データの単なる羅列（「調子はfairです」等）は禁止です。
以下のデータを解釈し、医師がカルテに記載するような、**自然で専門的な日本語**で要約してください。

【データ読み替えルール】
- 調子 (dayOverall/todayMode): good=「良好/安定」, fair=「普通/維持」, bad=「不調/不安定」, busy=「多忙/高活動」
- 睡眠の質 (sleepQuality): 1〜5。3が標準。低いと「質が低下」、高いと「熟眠感あり」。
- 昼寝 (napDuration): 分単位での昼寝時間。多いと日中の倦怠感。
- 頭痛予兆 (migraineProdrome): 0〜3。高いほど頭痛の気配が強い。
- 疲労感 (fatigueLevel): 0〜3。高いほど日中の疲れ・倦怠感が強い。
- AI反響 (echoSummary): 日々のAIからの励ましメッセージ（参考情報として、患者の心理状態の把握に使う）。

【対象期間】
${data.startDate} 〜 ${data.endDate} (${data.phaseInfo || '特になし'})

【主な症状】
${symptomsText || 'なし'}

【頓服使用状況】
${medsText || 'なし'}

【日々の記録】
${logsText}

【出力フォーマット】
以下の構成で、**自然な文章**で記述してください（マークダウン使用）。
1. **期間中の経過所見**:
   気分の波、睡眠状態、活動レベルについて、データ数値をそのまま書かず、文章で統合して記述してください。
   （例：「期間を通じて気分は概ね安定しており、大きな崩れは見られなかった。睡眠も中程度で一定している。」）
2. **特記すべき変化**:
   症状の悪化、頓服の増減、特定のストレス要因など、医師が介入・確認すべき点。
3. **患者の訴え（要約）**:
   日記やメモから読み取れる主観的な悩み。

※挨拶不要。客観的かつ簡潔に。
    `.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ report: text });

  } catch (error: unknown) {
    console.error('Report API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
