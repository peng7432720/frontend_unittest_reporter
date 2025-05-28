// @ts-ignore
import * as core from '@actions/core';
// @ts-ignore
import { parse } from "lcov-parse";
// @ts-ignore
import * as fs from 'fs/promises';

async function run(): Promise<void> {
    try {
        // 1. Get input parameters
        const lcovPath: string = core.getInput('lcov-path', { required: true });
        const threshold: number = parseInt(core.getInput('threshold', { required: true }), 10);

        // 2. Verify file existence
        try {
            await fs.access(lcovPath);
        } catch {
            core.error(`LCOV file not found: ${lcovPath}`);
            core.setFailed('LCOV file does not exist');
            return;
        }

        // 3. Parse LCOV file
        const lcovContent: string = await fs.readFile(lcovPath, 'utf8');
        const coverageData: any[] = await parse(lcovContent);

        // 4. Generate coverage report
        const coverageReport: { file: string; lines: number }[] = [];
        coverageData.forEach((file) => {
            if (file.lines && file.lines.length > 0) {
                const coveredLines: number = file.lines.filter((line: { hits: number }) => line.hits > 0).length;
                const lineCoverage: number = (coveredLines / file.lines.length) * 100;
                coverageReport.push({
                    file: file.name,
                    lines: Math.round(lineCoverage)
                });
            }
        });

        // 5. Output coverage report
        core.info('File coverage report:');
        coverageReport.forEach((item, index) => {
            core.info(`${index + 1}. ${item.file} - ${item.lines}%`);
        });

        // 6. Check coverage threshold
        const overallCoverage: number = coverageReport.reduce(
            (acc, curr) => acc + curr.lines,
            0
        ) / coverageReport.length;

        if (overallCoverage < threshold) {
            core.error(`Overall coverage (${overallCoverage.toFixed(2)}%) is below the threshold of ${threshold}%`);
            core.setFailed('Coverage did not meet the standard');
        } else {
            core.info(`Overall coverage meets the standard: ${overallCoverage.toFixed(2)}%`);
        }

        // 7. Output as GitHub Actions recognizable variable (optional)
        core.setOutput('coverage-report', JSON.stringify(coverageReport));
    } catch (error) {
        core.error(`Execution failed: ${(error as Error).message}`);
        core.setFailed('Action execution failed');
    }
}

run();
