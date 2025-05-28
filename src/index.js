"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const core = __importStar(require("@actions/core"));
// @ts-ignore
const lcov_parse_1 = require("lcov-parse");
// @ts-ignore
const fs = __importStar(require("fs/promises"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Get input parameters
            const lcovPath = core.getInput('lcov-path', { required: true });
            const threshold = parseInt(core.getInput('threshold', { required: true }), 10);
            // 2. Verify file existence
            try {
                yield fs.access(lcovPath);
            }
            catch (_a) {
                core.error(`LCOV file not found: ${lcovPath}`);
                core.setFailed('LCOV file does not exist');
                return;
            }
            // 3. Parse LCOV file
            const lcovContent = yield fs.readFile(lcovPath, 'utf8');
            const coverageData = yield (0, lcov_parse_1.parse)(lcovContent);
            // 4. Generate coverage report
            const coverageReport = [];
            coverageData.forEach((file) => {
                if (file.lines && file.lines.length > 0) {
                    const coveredLines = file.lines.filter((line) => line.hits > 0).length;
                    const lineCoverage = (coveredLines / file.lines.length) * 100;
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
            const overallCoverage = coverageReport.reduce((acc, curr) => acc + curr.lines, 0) / coverageReport.length;
            if (overallCoverage < threshold) {
                core.error(`Overall coverage (${overallCoverage.toFixed(2)}%) is below the threshold of ${threshold}%`);
                core.setFailed('Coverage did not meet the standard');
            }
            else {
                core.info(`Overall coverage meets the standard: ${overallCoverage.toFixed(2)}%`);
            }
            // 7. Output as GitHub Actions recognizable variable (optional)
            core.setOutput('coverage-report', JSON.stringify(coverageReport));
        }
        catch (error) {
            core.error(`Execution failed: ${error.message}`);
            core.setFailed('Action execution failed');
        }
    });
}
run();
