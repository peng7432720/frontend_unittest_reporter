import * as core from '@actions/core';
import parse from "lcov-parse";
import * as fs from 'fs/promises';
import * as fsAppend from 'fs/promises'; // 用于文件追加

// ==================== 工具函数 ====================
async function appendToFile(content: string, envVarName: string): Promise<boolean> {
    const filePath = process.env[envVarName];
    if (!filePath) {
        core.warning(`无法写入环境文件：环境变量 ${envVarName} 未设置`);
        return false;
    }

    try {
        await fsAppend.appendFile(filePath, content, 'utf-8');
        return true;
    } catch (error) {
        core.warning(`写入文件 ${filePath} 失败：${(error as Error).message}`);
        return false;
    }
}

async function addToJobSummary(markdown: string): Promise<boolean> {
    return appendToFile(markdown, 'GITHUB_STEP_SUMMARY');
}

// ==================== 主逻辑 ====================
interface FileCoverage {
    file: string;
    percentage: number;
}

async function run(): Promise<void> {
    try {
        // 1. 获取输入参数
        const lcovPath: string = core.getInput('lcov-path', { required: true });
        const threshold: number = parseInt(core.getInput('threshold', { required: true }), 10);

        // 2. 验证 LCOV 文件存在
        try {
            await fs.access(lcovPath);
        } catch {
            core.error(`LCOV 文件未找到：${lcovPath}`);
            core.setFailed('LCOV 文件不存在');
            return;
        }

        // 3. 解析 LCOV 文件
        const lcovContent = await fs.readFile(lcovPath, 'utf-8');
        const coverageData = await new Promise<parse.LcovFile[] | undefined>((resolve, reject) => {
            parse(lcovContent, (err, data) => err ? reject(err) : resolve(data));
        });

        if (!coverageData) throw new Error('LCOV 文件解析失败');

        // 4. 生成覆盖率报告
        const coverageReport: FileCoverage[] = coverageData
            .filter(file => file.lines?.found && file.lines.found > 0)
            .map(file => ({
                file: file.file,
                percentage: (file.lines!.hit / file.lines!.found) * 100
            }));

        // 5. 计算整体覆盖率
        const overallCoverage = coverageReport.reduce(
            (sum, item) => sum + item.percentage,
            0
        ) / coverageReport.length;

        // 6. 生成 Markdown 内容并写入 Job Summary
        const markdown = `
## 📊 代码覆盖率报告

🔍 阈值：${threshold}%

| 文件路径 | 覆盖率 |
|---------|-------|
${coverageReport.map(item => `| ${item.file} | ${item.percentage.toFixed(2)}% |`).join('\n')}

### 整体覆盖率
${overallCoverage >= threshold ? '✅' : '⚠️'} ${overallCoverage.toFixed(2)}%
        `;

        const writeSuccess = await addToJobSummary(markdown);
        if (!writeSuccess) core.warning('覆盖率摘要写入失败');

        // 7. 原有日志输出和阈值检查（保留）
        core.info('文件覆盖率详情：');
        coverageReport.forEach((item, index) => {
            core.info(`${index + 1}. ${item.file} - ${item.percentage.toFixed(2)}%`);
        });

        if (overallCoverage < threshold) {
            core.setFailed(`整体覆盖率 ${overallCoverage.toFixed(2)}% 低于阈值 ${threshold}%`);
        }

    } catch (error) {
        core.error(`执行失败：${(error as Error).message}`);
        core.setFailed('Action 执行失败');
    }
}

run();