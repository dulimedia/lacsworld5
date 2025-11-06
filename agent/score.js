import fs from 'fs';

export function scoreRun(run) {
  const { fpsIdle, fpsMove, longTasks, bytes, draws } = run;
  
  const normalizedFpsIdle = Math.min(fpsIdle / 60, 1);
  const normalizedFpsMove = Math.min(fpsMove / 60, 1);
  const longTasksPenalty = Math.min(longTasks / 10, 1);
  const bytesPenalty = Math.min(bytes / 5e6, 1);
  const drawsPenalty = Math.min(draws / 2000, 1);
  
  return (
    0.4 * normalizedFpsIdle +
    0.3 * normalizedFpsMove -
    0.15 * longTasksPenalty -
    0.10 * bytesPenalty -
    0.05 * drawsPenalty
  );
}

export function loadScorecard(path = 'reports/auto_refine/scorecard.json') {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return { runs: [], baseline: null };
  }
}

export function saveScorecard(data, path = 'reports/auto_refine/scorecard.json') {
  fs.mkdirSync('reports/auto_refine', { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

export function updateScorecard(newRun) {
  const scorecard = loadScorecard();
  const score = scoreRun(newRun);
  
  scorecard.runs.push({
    ...newRun,
    score,
    timestamp: new Date().toISOString()
  });
  
  if (!scorecard.baseline) {
    scorecard.baseline = { ...newRun, score };
  }
  
  saveScorecard(scorecard);
  return { scorecard, score };
}
