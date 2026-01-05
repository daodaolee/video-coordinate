'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Textarea } from '../src/components/ui/textarea';
import { Badge } from '../src/components/ui/badge';
import { Upload, Search, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Checkbox } from '../src/components/ui/checkbox';
import * as XLSX from 'xlsx';

interface SheetData {
  name: string;
  checked: boolean;
}

interface CompareResult {
  targetParams: string[];
  actualParams: string[];
  missingParams: string[];
  matchedParams: string[];
  actualParamsWithValues: Record<string, any>;
}

export default function TrackingCompare() {
  const [targetParams, setTargetParams] = useState('');
  const [actualParams, setActualParams] = useState('');
  const [fileName, setFileName] = useState('');
  const [showSheetSelection, setShowSheetSelection] = useState(false);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [currentWorkbook, setCurrentWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理Excel上传
  const handleExcelUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setCurrentWorkbook(workbook);

        // 显示Sheet选择
        const targetSheets = ['用户属性', '公共属性', '事件属性'];
        const sheetData = workbook.SheetNames.map((name) => ({
          name,
          checked: targetSheets.some((target) => name.includes(target)),
        }));
        setSheets(sheetData);
        setShowSheetSelection(true);
      } catch (error) {
        console.error('Excel解析错误:', error);
        alert('Excel文件解析失败，请确保文件格式正确');
      }
    };

    reader.onerror = () => {
      alert('文件读取失败');
    };

    reader.readAsArrayBuffer(file);
  };

  // 应用选中的Sheets
  const applySelectedSheets = () => {
    if (!currentWorkbook) return;

    const selectedSheets = sheets.filter((s) => s.checked);

    if (selectedSheets.length === 0) {
      alert('请至少选择一个Sheet页');
      return;
    }

    const allParams = new Set<string>();
    const skippedCount = 0;
    let headerInfo: string | null = null;

    selectedSheets.forEach((sheet) => {
      const worksheet = currentWorkbook.Sheets[sheet.name];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
        const cell = worksheet[cellAddress];

        if (!cell || !cell.v) continue;

        // 第一行作为表头
        if (row === range.s.r) {
          if (!headerInfo) {
            const headers: string[] = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
              const headerAddr = XLSX.utils.encode_cell({ r: row, c: col });
              const headerCell = worksheet[headerAddr];
              if (headerCell && headerCell.v) {
                headers.push(String(headerCell.v).trim());
              }
            }
            headerInfo = headers.join(' | ');
          }
          continue;
        }

        // 跳过有删除线的单元格（在xlsx中无法直接检测，这里简化处理）
        const cellValue = String(cell.v).trim();
        if (cellValue) {
          allParams.add(cellValue);
        }
      }
    });

    setTargetParams(Array.from(allParams).join('\n'));

    const selectedSheetNames = selectedSheets.map((s) => s.name).join('、');
    let message = `成功从 [${selectedSheetNames}] 导入 ${allParams.size} 个参数`;
    if (headerInfo) {
      message += `\n表头信息：${headerInfo}`;
    }
    if (skippedCount > 0) {
      message += `\n（已跳过 ${skippedCount} 个有删除线的参数）`;
    }
    alert(message);
  };

  // 递归提取对象的所有键
  const extractKeysRecursively = (obj: any, params: Set<string>) => {
    if (typeof obj !== 'object' || obj === null) return;

    Object.keys(obj).forEach((key) => {
      params.add(key);
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        extractKeysRecursively(obj[key], params);
      }
    });
  };

  // 提取键值对
  const extractKeysWithValues = (obj: any, result: Record<string, any>) => {
    if (typeof obj !== 'object' || obj === null) return;

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      result[key] = value;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        extractKeysWithValues(value, result);
      }
    });
  };

  // 解析参数（支持JSON或每行一个）
  const parseParams = (text: string): string[] => {
    if (!text.trim()) return [];

    const params = new Set<string>();

    // 尝试解析JSON
    try {
      const json = JSON.parse(text);
      if (typeof json === 'object' && json !== null) {
        extractKeysRecursively(json, params);
        return Array.from(params);
      }
    } catch (e) {
      // 不是JSON，按行解析
    }

    // 按行解析
    text.split('\n').forEach((line) => {
      line = line.trim();
      if (line) {
        const match = line.match(/^["']?([\$a-zA-Z0-9_\-\.]+)/);
        if (match) {
          params.add(match[1]);
        }
      }
    });

    return Array.from(params);
  };

  // 解析参数并保留值
  const parseParamsWithValues = (text: string): Record<string, any> => {
    if (!text.trim()) return {};

    try {
      const json = JSON.parse(text);
      if (typeof json === 'object' && json !== null) {
        const result: Record<string, any> = {};
        extractKeysWithValues(json, result);
        return result;
      }
    } catch (e) {
      // 不是JSON
    }

    return {};
  };

  // 执行对比
  const handleCompare = () => {
    if (!targetParams.trim()) {
      alert('请输入目标参数');
      return;
    }

    if (!actualParams.trim()) {
      alert('请输入实际上报参数');
      return;
    }

    const target = parseParams(targetParams);
    const actual = parseParams(actualParams);
    const actualWithValues = parseParamsWithValues(actualParams);

    const actualSet = new Set(actual);
    const missing = target.filter((param) => !actualSet.has(param));
    const matched = target.filter((param) => actualSet.has(param));

    setCompareResult({
      targetParams: target,
      actualParams: actual,
      missingParams: missing,
      matchedParams: matched,
      actualParamsWithValues: actualWithValues,
    });
  };

  // 清空所有
  const handleClear = () => {
    setTargetParams('');
    setActualParams('');
    setFileName('');
    setShowSheetSelection(false);
    setSheets([]);
    setCurrentWorkbook(null);
    setCompareResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 切换Sheet选中状态
  const toggleSheet = (index: number) => {
    const newSheets = [...sheets];
    newSheets[index].checked = !newSheets[index].checked;
    setSheets(newSheets);
  };

  return (
    <div className="flex items-center justify-center h-full p-6 bg-[#000]">
      <div className="w-full max-w-7xl">
        {/* 标题 */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white mb-1">埋点参数对比</h1>
          <p className="text-sm text-zinc-400">对比目标参数与实际上报参数，快速找出缺失的埋点</p>
        </div>

        {/* 输入区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 目标参数 */}
          <Card className="bg-[#232326] border border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">目标参数</CardTitle>
              <p className="text-xs text-zinc-400 mt-1">每行一个参数名称</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 文件上传 */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  上传Excel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                {fileName && (
                  <span className="text-xs text-zinc-400 flex items-center truncate flex-1">
                    {fileName}
                  </span>
                )}
              </div>

              {/* Sheet选择 */}
              {showSheetSelection && (
                <div className="bg-[#18181b] border border-[#333] rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-zinc-300 mb-2">选择要导入的Sheet</div>
                  <div className="space-y-1.5">
                    {sheets.map((sheet, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Checkbox
                          id={`sheet-${index}`}
                          checked={sheet.checked}
                          onCheckedChange={() => toggleSheet(index)}
                        />
                        <label
                          htmlFor={`sheet-${index}`}
                          className="text-xs text-zinc-300 cursor-pointer"
                        >
                          {sheet.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-[#18181b] text-white border border-[#333] hover:bg-[#333] text-xs mt-2"
                    onClick={applySelectedSheets}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    应用选择
                  </Button>
                </div>
              )}

              {/* 文本输入 */}
              <Textarea
                value={targetParams}
                onChange={(e) => setTargetParams(e.target.value)}
                placeholder="user_id&#10;event_name&#10;page_url&#10;timestamp"
                className="min-h-[350px] font-mono text-xs bg-[#18181b] border border-[#333] text-zinc-100 placeholder:text-zinc-500"
              />
            </CardContent>
          </Card>

          {/* 实际上报参数 */}
          <Card className="bg-[#232326] border border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">实际上报参数</CardTitle>
              <p className="text-xs text-zinc-400 mt-1">支持JSON格式或每行一个</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={actualParams}
                onChange={(e) => setActualParams(e.target.value)}
                placeholder={'{"user_id": "123", "event_name": "click"}'}
                className="min-h-[350px] font-mono text-xs bg-[#18181b] border border-[#333] text-zinc-100 placeholder:text-zinc-500"
              />
            </CardContent>
          </Card>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleCompare}
            className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333]"
          >
            <Search className="w-4 h-4 mr-2" />
            开始对比
          </Button>
          <Button
            onClick={handleClear}
            variant="outline"
            className="border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清空
          </Button>
        </div>

        {/* 对比结果 */}
        {compareResult && (
          <Card className="bg-[#232326] border border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">对比结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 统计 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#18181b] border border-[#333] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {compareResult.targetParams.length}
                  </div>
                  <div className="text-xs text-zinc-400">目标参数</div>
                </div>
                <div className="bg-[#18181b] border border-[#333] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {compareResult.actualParams.length}
                  </div>
                  <div className="text-xs text-zinc-400">实际上报</div>
                </div>
                <div className="bg-[#18181b] border border-[#333] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {compareResult.missingParams.length}
                  </div>
                  <div className="text-xs text-zinc-400">缺失参数</div>
                </div>
              </div>

              {/* 已找到的参数 */}
              {compareResult.matchedParams.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-zinc-300">已匹配参数</span>
                  </div>
                  <div className="bg-[#18181b] border border-[#333] rounded-lg max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0d0d10] border-b border-[#333] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-zinc-300 w-[35%]">
                            参数名
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-zinc-300">参数值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareResult.matchedParams.map((param, index) => {
                          const value = compareResult.actualParamsWithValues[param];
                          let displayValue = '';

                          if (typeof value === 'object' && value !== null) {
                            displayValue = JSON.stringify(value);
                          } else if (value === null) {
                            displayValue = 'null';
                          } else if (value === undefined) {
                            displayValue = 'undefined';
                          } else {
                            displayValue = String(value);
                          }

                          return (
                            <tr key={index} className="border-b border-[#333]/30">
                              <td className="px-3 py-2 font-mono text-cyan-400">{param}</td>
                              <td className="px-3 py-2 font-mono text-zinc-300 break-all">
                                {displayValue}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 缺失的参数 */}
              {compareResult.missingParams.length === 0 ? (
                <div className="flex items-center justify-center py-8 bg-[#18181b] border border-[#333] rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mr-2" />
                  <span className="text-sm text-zinc-300">所有目标参数都已上报</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-zinc-300">缺失参数</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compareResult.missingParams.map((param, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs font-mono"
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
