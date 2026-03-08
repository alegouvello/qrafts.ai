import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Save,
  Loader2,
  CheckCircle,
  Sparkles,
  Lightbulb,
  BookmarkPlus,
  Library,
  TrendingUp,
  Info,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Edit2,
  Trash2,
  X,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_order: number;
}

interface ConfidenceScore {
  score: number;
  reasoning: string;
  suggestions?: string;
}

interface QuestionCardProps {
  question: Question;
  index: number;
  answer: string;
  savedAnswer: string;
  isMobile: boolean;
  isExpanded: boolean;
  confidenceScore?: ConfidenceScore;
  expandedConfidence: string | null;
  isAutoPopulated: boolean;
  isCopied: boolean;
  isSaving: boolean;
  isSuggesting: boolean;
  isImproving: boolean;
  isMakingNatural: boolean;
  isCalculatingConfidence: boolean;
  isApplyingSuggestion: boolean;
  editingQuestionId: string | null;
  editingQuestionText: string;
  onToggleQuestion: (id: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  onSaveAnswer: (questionId: string) => void;
  onGetSuggestion: (questionId: string, questionText: string) => void;
  onImproveAnswer: (questionId: string, questionText: string) => void;
  onMakeNatural: (questionId: string, questionText: string) => void;
  onCalculateConfidence: (questionId: string, questionText: string) => void;
  onQuickApplySuggestion: (questionId: string, questionText: string) => void;
  onCopyAnswer: (questionId: string) => void;
  onSaveAsTemplate: (questionId: string) => void;
  onBrowseTemplates: (questionId: string) => void;
  onStartEditing: (questionId: string, questionText: string) => void;
  onConfirmEdit: (questionId: string, newText: string) => void;
  onCancelEdit: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onSetExpandedConfidence: (id: string | null) => void;
  onEditingQuestionTextChange: (text: string) => void;
}

export const QuestionCard = ({
  question,
  index,
  answer,
  savedAnswer,
  isMobile,
  isExpanded,
  confidenceScore,
  expandedConfidence,
  isAutoPopulated,
  isCopied,
  isSaving,
  isSuggesting,
  isImproving,
  isMakingNatural,
  isCalculatingConfidence,
  isApplyingSuggestion,
  editingQuestionId,
  editingQuestionText,
  onToggleQuestion,
  onAnswerChange,
  onSaveAnswer,
  onGetSuggestion,
  onImproveAnswer,
  onMakeNatural,
  onCalculateConfidence,
  onQuickApplySuggestion,
  onCopyAnswer,
  onSaveAsTemplate,
  onBrowseTemplates,
  onStartEditing,
  onConfirmEdit,
  onCancelEdit,
  onDeleteQuestion,
  onSetExpandedConfidence,
  onEditingQuestionTextChange,
}: QuestionCardProps) => {
  const hasAnswer = savedAnswer?.trim();
  const isModified = answer !== savedAnswer;
  const hasCurrentAnswer = answer?.trim();

  const isFileUpload = (() => {
    const lowerQuestion = question.question_text.toLowerCase();
    const hasUploadKeyword =
      lowerQuestion.includes("upload") ||
      lowerQuestion.includes("attach") ||
      lowerQuestion.includes("submit a");
    const hasFileKeyword =
      lowerQuestion.includes("resume") ||
      lowerQuestion.includes("cv") ||
      lowerQuestion.includes("cover letter");
    return hasUploadKeyword && hasFileKeyword;
  })();

  const isShortAnswer = (() => {
    const lowerQuestion = question.question_text.toLowerCase();
    const questionWords = lowerQuestion.split(" ").length;
    const isYesNoQuestion =
      lowerQuestion.includes("are you") ||
      lowerQuestion.includes("do you") ||
      lowerQuestion.includes("will you") ||
      lowerQuestion.includes("have you") ||
      lowerQuestion.includes("can you") ||
      (lowerQuestion.includes("?") && questionWords > 5);
    const isShortField =
      lowerQuestion.includes("first name") ||
      lowerQuestion.includes("last name") ||
      lowerQuestion.includes("email") ||
      lowerQuestion.includes("phone") ||
      lowerQuestion.includes("linkedin") ||
      lowerQuestion.includes("github") ||
      lowerQuestion.includes("portfolio") ||
      lowerQuestion.includes("website") ||
      lowerQuestion.includes("location") ||
      lowerQuestion.includes("city") ||
      lowerQuestion.includes("office") ||
      lowerQuestion === "name" ||
      lowerQuestion.includes("your name");
    return (isYesNoQuestion || isShortField) && (answer || "").length < 150;
  })();

  const isEditing = editingQuestionId === question.id;

  return (
    <Card className="p-4 bg-card/30 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
      <Collapsible
        open={isExpanded}
        onOpenChange={() => isMobile && onToggleQuestion(question.id)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <CollapsibleTrigger
                asChild
                className={isMobile ? "cursor-pointer" : "cursor-default"}
              >
                <div className="flex items-start gap-2 flex-1 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editingQuestionText}
                        onChange={(e) => onEditingQuestionTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1"
                      />
                    ) : (
                      <h3 className="font-medium leading-tight flex-1 min-w-0">
                        {question.question_text}
                      </h3>
                    )}
                    {isEditing ? (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onConfirmEdit(question.id, editingQuestionText);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelEdit();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartEditing(question.id, question.question_text);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this question?")) {
                              onDeleteQuestion(question.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {isMobile && (
                      <button className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                  {isAutoPopulated && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Auto-filled
                    </Badge>
                  )}
                  {confidenceScore && (
                    <Badge
                      variant={
                        confidenceScore.score >= 80
                          ? "default"
                          : confidenceScore.score >= 60
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-xs flex-shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetExpandedConfidence(
                          expandedConfidence === question.id ? null : question.id
                        );
                      }}
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      ~{confidenceScore.score}% fit
                    </Badge>
                  )}
                </div>
              </CollapsibleTrigger>
              {hasAnswer && !isModified && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>

            <CollapsibleContent className="animate-accordion-down">
              {/* Confidence Score Details */}
              {confidenceScore && expandedConfidence === question.id && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Analysis:</span>{" "}
                        {confidenceScore.reasoning}
                      </p>
                      {confidenceScore.suggestions && confidenceScore.score < 100 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              Suggestions to improve:
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onQuickApplySuggestion(question.id, question.question_text)
                              }
                              disabled={isApplyingSuggestion}
                              className="h-7 text-xs"
                            >
                              {isApplyingSuggestion ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Applying...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Quick Apply
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {confidenceScore.suggestions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Your Answer</span>
                  {hasCurrentAnswer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopyAnswer(question.id)}
                      className="h-8"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {isFileUpload ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      File upload - Please upload directly on the application form
                    </div>
                    <Input
                      placeholder="Or paste file URL here..."
                      value={answer || ""}
                      onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    />
                  </div>
                ) : isShortAnswer ? (
                  <Input
                    placeholder="Type your answer here..."
                    value={answer || ""}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  />
                ) : (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={answer || ""}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className="min-h-[100px]"
                  />
                )}
              </div>
              {!isFileUpload && (
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    onClick={() => onGetSuggestion(question.id, question.question_text)}
                    disabled={isSuggesting}
                    variant="outline"
                    size="sm"
                  >
                    {isSuggesting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        AI Suggest
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => onBrowseTemplates(question.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Library className="h-3 w-3 mr-1.5" />
                    Templates
                  </Button>
                  {hasCurrentAnswer && (
                    <>
                      <Button
                        onClick={() => onImproveAnswer(question.id, question.question_text)}
                        disabled={isImproving}
                        variant="outline"
                        size="sm"
                      >
                        {isImproving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="h-3 w-3 mr-1.5" />
                            Improve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => onMakeNatural(question.id, question.question_text)}
                        disabled={isMakingNatural}
                        variant="outline"
                        size="sm"
                      >
                        {isMakingNatural ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Rewriting...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3 w-3 mr-1.5" />
                            More Natural
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() =>
                          onCalculateConfidence(question.id, question.question_text)
                        }
                        disabled={isCalculatingConfidence}
                        variant="outline"
                        size="sm"
                      >
                        {isCalculatingConfidence ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Calculating...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1.5" />
                            Check Fit
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => onSaveAsTemplate(question.id)}
                        variant="outline"
                        size="sm"
                      >
                        <BookmarkPlus className="h-3 w-3 mr-1.5" />
                        Save
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => onSaveAnswer(question.id)}
                    disabled={isSaving || !isModified}
                    size="sm"
                    className="ml-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1.5" />
                        Save Answer
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>
    </Card>
  );
};
