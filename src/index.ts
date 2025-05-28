import * as core from '@actions/core';
import parse from "lcov-parse";
import * as fs from 'fs/promises';

async function run(): Promise<void> {
    try {
        // 1. Get input parameters
        const lcovPath: string = core.getInput('lcov-path', { required: true });
        const threshold: number = parseInt(core.getInput('threshold', { required: true }), 10);

        // const lcovPath: string = 'reports/coverage/lcov.info';
        // const threshold: number = 10;

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
        const coverageData = await new Promise<parse.LcovFile[] | undefined>((resolve, reject) => {
            parse(lcovContent, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(data);
            })
        });

        if(!coverageData) {
            throw new Error('Failed to parse LCOV file');
        }

        // 4. Generate coverage report
        const coverageReport: { file: string; lines: number }[] = [];
        coverageData.forEach((file) => {
            if (file.lines && file.lines.found > 0) {
                const lineCoverage: number = (file.lines.hit / file.lines.found) * 100;
                coverageReport.push({
                    file: file.file,
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
