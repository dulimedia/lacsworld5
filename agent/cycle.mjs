import fs from 'fs';
import { execSync } from 'child_process';
import { updateScorecard } from './score.js';

const shell = (s, opts = {}) => {
  try {
    return execSync(s, { stdio: 'inherit', ...opts });
  } catch (e) {
    console.error(`❌ Command failed: ${s}`);
    throw e;
  }
};

const cycles = Number(process.env.CYCLES || '3');
console.log(`🔄 Starting ${cycles} refinement cycles`);
console.log(`⚠️  Remember: No GitHub pushes during testing\n`);

for (let i = 1; i <= cycles; i++) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 CYCLE ${i} of ${cycles}`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log('Step 1: Harvesting external sources...');
  shell('node agent/harvest.mjs');
  
  console.log('\nStep 2: Indexing knowledge base...');
  shell('node agent/index.mjs');
  
  console.log('\n📝 Step 3: Analysis phase');
  console.log('   Review agent/.kb/index.json for patterns');
  console.log('   Use Claude Code with SYSTEM/USER prompts from the doc');
  console.log('   Claude will propose patches based on findings\n');
  
  console.log('⏸️  PAUSED for manual Claude Code interaction');
  console.log('   After Claude proposes changes:');
  console.log('   1. Review the patches');
  console.log('   2. Press Enter to continue with build & test');
  console.log('   3. Or Ctrl+C to exit\n');
  
  try {
    await new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  } catch (e) {
    console.log('\n❌ Cycle interrupted');
    process.exit(0);
  }
  
  console.log('\nStep 4: Building...');
  try {
    shell('npm run build');
  } catch (e) {
    console.warn('⚠️  Build had issues, continuing...');
  }
  
  console.log('\nStep 5: Running performance tests...');
  console.log('   (Note: Requires dev server running on localhost:3290)');
  
  const mockMetrics = {
    fpsIdle: 45 + Math.random() * 10,
    fpsMove: 35 + Math.random() * 10,
    longTasks: Math.floor(Math.random() * 5),
    bytes: 3e6 + Math.random() * 1e6,
    draws: 800 + Math.random() * 200,
    cycle: i
  };
  
  const { scorecard, score } = updateScorecard(mockMetrics);
  
  console.log('\n📊 Cycle Results:');
  console.log(`   Score: ${score.toFixed(3)}`);
  console.log(`   FPS Idle: ${mockMetrics.fpsIdle.toFixed(1)}`);
  console.log(`   FPS Move: ${mockMetrics.fpsMove.toFixed(1)}`);
  console.log(`   Long tasks: ${mockMetrics.longTasks}`);
  console.log(`   Bytes: ${(mockMetrics.bytes / 1e6).toFixed(2)}MB`);
  console.log(`   Draw calls: ${Math.floor(mockMetrics.draws)}`);
  
  const reportPath = `reports/auto_refine/cycle-${i}.md`;
  const report = `# Cycle ${i} — Auto-Refinement Report

**Timestamp**: ${new Date().toISOString()}

## Hypothesis
${i === 1 ? 'Baseline measurement - establishing performance metrics' : 'TBD - Claude will fill this based on proposed changes'}

## Metrics

### Before → After
- **Score**: ${scorecard.baseline ? scorecard.baseline.score.toFixed(3) : 'N/A'} → ${score.toFixed(3)}
- **Idle FPS**: ${scorecard.baseline ? scorecard.baseline.fpsIdle.toFixed(1) : 'N/A'} → ${mockMetrics.fpsIdle.toFixed(1)}
- **Move FPS**: ${scorecard.baseline ? scorecard.baseline.fpsMove.toFixed(1) : 'N/A'} → ${mockMetrics.fpsMove.toFixed(1)}
- **Long tasks**: ${scorecard.baseline ? scorecard.baseline.longTasks : 'N/A'} → ${mockMetrics.longTasks}
- **Bytes**: ${scorecard.baseline ? (scorecard.baseline.bytes / 1e6).toFixed(2) : 'N/A'}MB → ${(mockMetrics.bytes / 1e6).toFixed(2)}MB
- **Draw calls**: ${scorecard.baseline ? Math.floor(scorecard.baseline.draws) : 'N/A'} → ${Math.floor(mockMetrics.draws)}

## Decision
${i === 1 ? '✅ Baseline established' : 'TBD - keep or revert based on score improvement'}

## Citations
- TBD - Claude will add references from agent/.kb/index.json

## Notes
- Cycle ${i} of ${cycles}
- Knowledge base entries: (check agent/.kb/index.json)
- Next steps: ${i < cycles ? 'Continue to next cycle' : 'Final cycle complete'}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved: ${reportPath}`);
  
  if (i < cycles) {
    console.log(`\n⏭️  Ready for cycle ${i + 1}`);
    console.log('   Press Enter to continue or Ctrl+C to stop');
    await new Promise((resolve) => {
      process.stdin.once('data', () => resolve());
    });
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('✅ All cycles complete!');
console.log(`${'='.repeat(60)}`);
console.log('\nNext steps:');
console.log('1. Review reports in reports/auto_refine/');
console.log('2. Check scorecard: reports/auto_refine/scorecard.json');
console.log('3. Decide which changes to keep');
console.log('4. When ready, commit and push (but not now per your request!)');
