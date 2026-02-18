/**
 * テンプレートエディタコンポーネント
 * 評価項目テンプレートの作成・編集・削除・選択を行う
 * テンプレートごとにスコア選択肢も設定可能
 */
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Trash2,
    Edit3,
    Save,
    X,
    ClipboardList,
    GripVertical,
    Check,
} from "lucide-react";
import type { EvalTemplate, EvalTemplateItem } from "@/hooks/useEvalTemplates";
import { type ScoreOption, DEFAULT_SCORE_OPTIONS } from "@/hooks/useInterviewStore";

/** スコアプリセット定義 */
const SCORE_PRESETS: { id: string; label: string; options: ScoreOption[] }[] = [
    {
        id: "5scale",
        label: "5段階",
        options: [...DEFAULT_SCORE_OPTIONS],
    },
    {
        id: "3scale",
        label: "A/B/C",
        options: [
            { value: "", label: "-" },
            { value: "A", label: "A (優秀)" },
            { value: "B", label: "B (標準)" },
            { value: "C", label: "C (要改善)" },
        ],
    },
    {
        id: "4scale",
        label: "S/A/B/C",
        options: [
            { value: "", label: "-" },
            { value: "S", label: "S (非常に優秀)" },
            { value: "A", label: "A (優秀)" },
            { value: "B", label: "B (標準)" },
            { value: "C", label: "C (要改善)" },
        ],
    },
    {
        id: "passfail",
        label: "合否",
        options: [
            { value: "", label: "-" },
            { value: "pass", label: "✅ 合格" },
            { value: "fail", label: "❌ 不合格" },
            { value: "pending", label: "⏳ 保留" },
        ],
    },
];

interface TemplateEditorProps {
    /** テンプレート一覧 */
    templates: EvalTemplate[];
    /** 現在アクティブなテンプレートID */
    activeTemplateId: string;
    /** テンプレート追加コールバック */
    onAdd: (name: string, items: EvalTemplateItem[], scoreOptions?: ScoreOption[]) => EvalTemplate;
    /** テンプレート更新コールバック */
    onUpdate: (id: string, name: string, items: EvalTemplateItem[], scoreOptions?: ScoreOption[]) => void;
    /** テンプレート削除コールバック */
    onDelete: (id: string) => void;
    /** テンプレート適用コールバック */
    onApply: (templateId: string, labels: string[]) => void;
    /** 最大項目数 */
    maxItems: number;
}

export default function TemplateEditor({
    templates,
    activeTemplateId,
    onAdd,
    onUpdate,
    onDelete,
    onApply,
    maxItems,
}: TemplateEditorProps) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editItems, setEditItems] = useState<EvalTemplateItem[]>([]);
    const [editScoreOptions, setEditScoreOptions] = useState<ScoreOption[]>([...DEFAULT_SCORE_OPTIONS]);
    const [showCustomScore, setShowCustomScore] = useState(false);
    const [customScoreText, setCustomScoreText] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    /** 新規作成モードを開始 */
    const startCreate = useCallback(() => {
        setIsCreating(true);
        setEditingId(null);
        setEditName("");
        setEditItems([{ label: "" }]);
        setEditScoreOptions([...DEFAULT_SCORE_OPTIONS]);
        setShowCustomScore(false);
    }, []);

    /** 編集モードを開始 */
    const startEdit = useCallback((template: EvalTemplate) => {
        setEditingId(template.id);
        setIsCreating(false);
        setEditName(template.name);
        setEditItems([...template.items]);
        setEditScoreOptions(template.scoreOptions ? [...template.scoreOptions] : [...DEFAULT_SCORE_OPTIONS]);
        setShowCustomScore(false);
    }, []);

    /** 編集キャンセル */
    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setIsCreating(false);
        setShowCustomScore(false);
    }, []);

    /** 項目を追加 */
    const addItem = useCallback(() => {
        if (editItems.length >= maxItems) return;
        setEditItems((prev) => [...prev, { label: "" }]);
    }, [editItems.length, maxItems]);

    /** 項目を削除 */
    const removeItem = useCallback((index: number) => {
        setEditItems((prev) => prev.filter((_, i) => i !== index));
    }, []);

    /** 項目ラベルを更新 */
    const updateItemLabel = useCallback((index: number, label: string) => {
        setEditItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, label } : item))
        );
    }, []);

    /** スコアプリセットを選択 */
    const selectScorePreset = useCallback((presetId: string) => {
        const preset = SCORE_PRESETS.find((p) => p.id === presetId);
        if (preset) {
            setEditScoreOptions([...preset.options]);
            setShowCustomScore(false);
        }
    }, []);

    /** カスタムスコアエディタを開く */
    const openCustomScoreEditor = useCallback(() => {
        const text = editScoreOptions
            .filter((opt) => opt.value !== "")
            .map((opt) => `${opt.value}:${opt.label}`)
            .join("\n");
        setCustomScoreText(text);
        setShowCustomScore(true);
    }, [editScoreOptions]);

    /** カスタムスコアを適用 */
    const applyCustomScore = useCallback(() => {
        const lines = customScoreText.split("\n").filter((l) => l.trim() !== "");
        const options: ScoreOption[] = [{ value: "", label: "-" }];
        for (const line of lines) {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
                const value = line.substring(0, colonIdx).trim();
                const label = line.substring(colonIdx + 1).trim();
                if (value && label) {
                    options.push({ value, label });
                }
            }
        }
        if (options.length > 1) {
            setEditScoreOptions(options);
            setShowCustomScore(false);
        } else {
            alert("有効なスコア定義が見つかりません。「値:ラベル」の形式で入力してください。");
        }
    }, [customScoreText]);

    /** 現在のスコアに一致するプリセットIDを返す */
    const getScorePresetId = useCallback((options: ScoreOption[]): string | null => {
        for (const preset of SCORE_PRESETS) {
            if (preset.options.length !== options.length) continue;
            const match = preset.options.every((opt, i) =>
                opt.value === options[i]?.value && opt.label === options[i]?.label
            );
            if (match) return preset.id;
        }
        return null;
    }, []);

    /** 保存 */
    const handleSave = useCallback(() => {
        const validItems = editItems.filter((item) => item.label.trim() !== "");
        if (!editName.trim() || validItems.length === 0) return;

        if (isCreating) {
            onAdd(editName.trim(), validItems, editScoreOptions);
        } else if (editingId) {
            onUpdate(editingId, editName.trim(), validItems, editScoreOptions);
        }
        cancelEdit();
    }, [editName, editItems, editScoreOptions, isCreating, editingId, onAdd, onUpdate, cancelEdit]);

    /** テンプレート適用 */
    const handleApply = useCallback(
        (template: EvalTemplate) => {
            onApply(
                template.id,
                template.items.map((item) => item.label)
            );
            setOpen(false);
        },
        [onApply]
    );

    const isEditing = editingId !== null || isCreating;
    const currentEditPresetId = getScorePresetId(editScoreOptions);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5" />
                    テンプレート
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        評価テンプレート管理
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* テンプレート一覧 */}
                    {!isEditing && (
                        <>
                            <div className="space-y-2">
                                {templates.map((tmpl) => {
                                    const presetId = getScorePresetId(tmpl.scoreOptions || DEFAULT_SCORE_OPTIONS);
                                    const presetLabel = presetId
                                        ? SCORE_PRESETS.find((p) => p.id === presetId)?.label
                                        : "カスタム";
                                    return (
                                        <div
                                            key={tmpl.id}
                                            className={`p-3 border rounded-lg transition-colors ${tmpl.id === activeTemplateId
                                                ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                                                : "border-border hover:bg-muted/50"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">{tmpl.name}</span>
                                                        {tmpl.id === activeTemplateId && (
                                                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                                                使用中
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">
                                                            📊 {presetLabel}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {tmpl.items.map((item, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="secondary"
                                                                className="text-[10px] px-1.5 py-0 font-normal"
                                                            >
                                                                {item.label}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 ml-2 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => startEdit(tmpl)}
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </Button>
                                                    {templates.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-500 hover:text-red-700"
                                                            onClick={() => onDelete(tmpl.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 適用ボタン */}
                                            {tmpl.id !== activeTemplateId && (
                                                <Button
                                                    size="sm"
                                                    className="mt-2 text-xs w-full bg-indigo-600 hover:bg-indigo-700"
                                                    onClick={() => handleApply(tmpl)}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    このテンプレートを使う
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <Button
                                onClick={startCreate}
                                variant="outline"
                                className="w-full text-xs gap-1.5 border-dashed"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                新しいテンプレートを作成
                            </Button>
                        </>
                    )}

                    {/* === 編集フォーム === */}
                    {isEditing && (
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                            <div>
                                <Label className="text-xs font-bold mb-1.5 block">
                                    テンプレート名
                                </Label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="例: 新卒エンジニア面接"
                                    className="text-sm"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="text-xs font-bold">
                                        評価項目（最大{maxItems}個）
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground">
                                        {editItems.length} / {maxItems}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {editItems.map((item, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground w-5 shrink-0">
                                                {i + 1}.
                                            </span>
                                            <Input
                                                value={item.label}
                                                onChange={(e) => updateItemLabel(i, e.target.value)}
                                                placeholder="項目名を入力..."
                                                className="text-sm flex-1"
                                            />
                                            {editItems.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 shrink-0"
                                                    onClick={() => removeItem(i)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {editItems.length < maxItems && (
                                    <Button
                                        onClick={addItem}
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-xs gap-1 w-full"
                                    >
                                        <Plus className="h-3 w-3" />
                                        項目を追加
                                    </Button>
                                )}
                            </div>

                            {/* スコア設定 */}
                            <div>
                                <Label className="text-xs font-bold mb-2 block">
                                    📊 スコア設定
                                </Label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {SCORE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => selectScorePreset(preset.id)}
                                            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${currentEditPresetId === preset.id
                                                    ? "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300 font-bold"
                                                    : "bg-background hover:bg-muted border-input"
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={openCustomScoreEditor}
                                        className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${currentEditPresetId === null
                                                ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300 font-bold"
                                                : "bg-background hover:bg-muted border-input"
                                            }`}
                                    >
                                        ✏️ カスタム
                                    </button>
                                </div>
                                {/* 現在のスコア表示 */}
                                <div className="flex flex-wrap gap-1">
                                    {editScoreOptions
                                        .filter((opt) => opt.value !== "")
                                        .map((opt) => (
                                            <span
                                                key={opt.value}
                                                className="px-1.5 py-0.5 text-[9px] bg-muted rounded border font-mono"
                                            >
                                                {opt.label}
                                            </span>
                                        ))}
                                </div>

                                {/* カスタムエディタ */}
                                {showCustomScore && (
                                    <div className="space-y-2 mt-2 p-2 border rounded bg-background">
                                        <p className="text-[10px] text-muted-foreground">
                                            「値:ラベル」の形式で1行ずつ入力
                                        </p>
                                        <Textarea
                                            value={customScoreText}
                                            onChange={(e) => setCustomScoreText(e.target.value)}
                                            className="text-xs font-mono h-20 resize-none"
                                            placeholder={"5:非常に良い\n4:良い\n3:普通\n2:やや不足\n1:不足"}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[10px]"
                                                onClick={() => setShowCustomScore(false)}
                                            >
                                                閉じる
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-6 text-[10px]"
                                                onClick={applyCustomScore}
                                            >
                                                適用
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleSave}
                                    size="sm"
                                    className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                                    disabled={
                                        !editName.trim() ||
                                        editItems.filter((i) => i.label.trim()).length === 0
                                    }
                                >
                                    <Save className="h-3 w-3 mr-1" />
                                    保存
                                </Button>
                                <Button
                                    onClick={cancelEdit}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs"
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
