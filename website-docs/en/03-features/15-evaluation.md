# Evaluation

Evaluate the effectiveness of comparing chunks, models, and retrieval configurations using a question-answer dataset with standard answers.The system creates an evaluation knowledge base and imports corpus, performs retrieval and generation on a question-by-question basis, and outputs indicators such as Precision, Recall, NDCG, MRR, map, Bleu, and Rouge.

::: tip Used via API
There is no independent interface entrance for the evaluation at the moment, passing`POST /api/v1/evaluation`Initiate`GET /api/v1/evaluation?task_id=...`Polling results; Admin is required for creation, Viewer permission is required for query.The dataset is in Parquet format, which is required below.
:::

When comparing configurations, the data set should be fixed, adjusting one variable at a time, and analyzing the results against the same set of indicators.

# # Run an evaluation

1. Use the built-in sample dataset or prepare the Parquet file in the format below and replace it under the service working directory`dataset/samples/`The file of the same name in (inside the container is`/app/dataset/samples/`）。
2. Select the Reference Knowledge Base, Conversation Model and Rearrangement Model by`POST /api/v1/evaluation`Create a task.The reference knowledge base is used to replicate the configuration, and the assessment uses a separate knowledge base.
3. Record the returned task ID by`GET /api/v1/evaluation?task_id=...`Query status and progress.
4. After the task is successful, compare the retrieval and generation indicators; when it fails, first check the task error, then adjust the configuration and re-run.

Admin permission is required to create tasks, Viewer permission is required for query results; API Key is also required`run_evaluations`Ability or full-access.

# # Dataset format

Dataset Services (`internal/application/service/dataset.go`From`./dataset/samples/`Load 5 * * Parquet * * files:

| File | Schema | Meaning |
| --- | --- | --- |
|`queries.parquet` | `id: int64, text: string`| Problem Set |
|`corpus.parquet` | `id: int64, text: string`| Corpus Paragraphs (Fill the Knowledge Base with Assessments) |
|`answers.parquet` | `id: int64, text: string`Suggested Answers`qrels.parquet` | `qid: int64, pid: int64`| Ground truth association of the → relevant paragraph of the question (retrieved by metric) |
|`qas.parquet` | `qid: int64, aid: int64`| → Question-answer mapping (based on generated metrics) |

Corresponding Go structure:```go
type TextInfo struct {
    ID   int64  `parquet:"id"`
    Text string `parquet:"text"`
}
type RelsInfo struct {
    QID int64 `parquet:"qid"`
    PID int64 `parquet:"pid"`
}
type QaInfo struct {
    QID int64 `parquet:"qid"`
    AID int64 `parquet:"aid"`
}
```After loading, assemble into a sample-by-sample`QAPair`（`internal/types/dataset.go`）：

```go
type QAPair struct {
    QID      int      // 问题 ID
    Question string   // 问题文本
    PIDs     []int    // 相关段落 ID（ground truth）
    Passages []string // 段落文本
    AID      int      // 答案 ID
    Answer   string   // 参考答案文本
}
```Service Always from`./dataset/samples/`Read these 5 files,`dataset_id`Currently only used to compose task IDs and will not be switched to another directory. When using a custom dataset, generate a Parquet file with the same name as the Schema above to replace the contents of the directory (Docker deployments can be mounted to`/app/dataset/samples/`). On load, the service prints statistics (number of questions, number of corpus, average number of relevant paragraphs, answer coverage, etc.).

# # Result Query`GET /api/v1/evaluation?task_id=<创建时返回的任务 ID>`Return`EvaluationDetail`：

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "evaluation_1_1758600000000_1a2b3c4d_default",
      "dataset_id": "default",
      "status": 2,
      "total": 100,
      "finished": 100
    },
    "params": { "...": "ChatManage 评估参数快照" },
    "metric": {
      "retrieval_metrics": {
        "precision": 0.85, "recall": 0.92,
        "ndcg3": 0.88, "ndcg10": 0.86,
        "mrr": 0.95, "map": 0.87
      },
      "generation_metrics": {
        "bleu1": 0.72, "bleu2": 0.65, "bleu4": 0.58,
        "rouge1": 0.78, "rouge2": 0.71, "rougel": 0.75
      }
    }
  }
}
```The interface can be polled during the task run to get`finished / total`Progress`status = 3`Hour`err_msg`Carry the reason for the failure.

> * * Note * *: Evaluation results are stored in * * memory * * (`evaluationMemoryStorage`：`map[string]*EvaluationDetail` + `sync.RWMutex`1303 (USA), see`internal/application/service/evaluation.go`), the tasks and results will be lost after the service restarts, and the evaluation will need to be re-initiated.

# # Indicator list

Indicator Registration Form available at`internal/application/service/metric_hook.go`, a total of 12 items, divided into two groups. Text first reads as follows:`metric/common.go`Word segmentation: Chinese with Jieba word segmentation, English by space segmentation, press`。` / `.`Cut sentences.

# # # Retrieval Metrics

| Metrics | Fields | Realization Files | Meaning |
| --- | --- | --- | --- |
| Precision |`precision` | `metric/precision.go`| Retrieval accuracy: number of relevant documents hit/total number of retrieval returns, averaged by GT set |
| Recall |`recall` | `metric/recall.go`| Retrieval recall rate: number of relevant documents hit/total number of relevant documents |
| NDCG @ 3 |`ndcg3` | `metric/ndcg.go`| Normalized impairment cumulative gain (top 3), rewards put relevant documents first |
| NDCG @ 10 |`ndcg10` | `metric/ndcg.go`| Ibid., top 10 |
| MRR |`mrr` | `metric/mrr.go`| Average of the penultimate ranking of the first relevant document:`sum(1/rank) / N` |
| MAP | `map` | `metric/map.go`| Mean Average Accuracy: cumulative for each hit position`Precision@k`Re-Normalization |

NDCG Core Computing (`metric/ndcg.go`）：

Ideal sorting uses all relevant documents after deduplication, up to the first k, regardless of the actual number of recalls. v0.9.0 fixes the problem of small denominators for a small number of recalls; when comparing the results before and after the upgrade, the baseline assessment should be re-run in the same version.```go
// DCG = sum((2^rel_i - 1) / log2(i+2))，rel 为 0/1
dcg += (math.Pow(2, float64(relevance)) - 1) / math.Log2(float64(i+2))
// NDCG = DCG / IDCG（理想排序的 DCG）
```MRR Core Computing (`metric/mrr.go`）：

```go
for i, predID := range ids {
    if _, ok := gtSet[predID]; ok {
        sumRR += 1.0 / float64(i+1) // 第一个命中位置的倒数
        break
    }
}
```# # # Generation Metrics

| Metrics | Fields | Realization Files | Meaning |
| --- | --- | --- | --- |
| BLEU-1 |`bleu1` | `metric/bleu.go`| 1-gram Accuracy (Weight`[1.0, 0, 0, 0]`） |
| BLEU-2 | `bleu2` | `metric/bleu.go`| 1/2-gram 50% each (weight`[0.5, 0.5, 0, 0]`） |
| BLEU-4 | `bleu4` | `metric/bleu.go`| 1-4-gram parity (`[0.25, 0.25, 0.25, 0.25]`), including brevity penalty |
| ROUGE-1 |`rouge1` | `metric/rouge.go`| Monadic Overlap F1 |
| ROUGE-2 |`rouge2` | `metric/rouge.go`| Dual Phrase Group Overlap F1 |
| Rouge-L |`rougel` | `metric/rouge.go`| Longest Common Subsequence (LCS) F1 |

Bleu Core (`metric/bleu.go`): Fixed weighted geometric mean of n-gram accuracy multiplied by short penalty`bp * exp(sum(w_i * log(p_i)))`. Rouge takes F1:`F1 = 2PR / (P + R + 1e-8)`（`metric/rouge_score.go`）。

When smoothing is not turned on, any n-grams with weight greater than zero should have zero precision and the Bleu should be zero. v0.9.0 fixes an issue where skipping these zero precision terms results in high scores.

# # Interface and Execution Reference

# # # API`internal/router/routes_infra.go`：

```go
evaluationRoutes := g.apiKeyGroup(r.Group("/evaluation"), apiKeyRunEvaluations(apiKeyFullAccess()))
{
    evaluationRoutes.POST("", g.Admin(), handler.Evaluation)
    evaluationRoutes.GET("", g.Viewer(), handler.GetEvaluationResult)
}
```| Method | Path | Permissions | Description |
| --- | --- | --- | --- |
| post |`/api/v1/evaluation`| Admin (API Key requires`run_evaluations`Capability or full-access) | Create an assessment task and return to task information immediately |
| get |`/api/v1/evaluation?task_id=...`| Viewer | Query task status, progress and metrics results |

# # # # Create Assessment Task

Request parameters (`internal/handler/evaluation.go`）：

```go
type EvaluationRequest struct {
    DatasetID       string `json:"dataset_id"`        // 数据集 ID，默认 "default"
    KnowledgeBaseID string `json:"knowledge_base_id"` // 参考知识库（复用其配置）
    ChatModelID     string `json:"chat_id"`           // 聊天模型
    RerankModelID   string `json:"rerank_id"`         // 重排模型
}
```| Parameters | Required | Default Behavior |
| --- | --- | --- |
|`dataset_id`| No | Defaults to`default`; For Task ID only, data is always read`dataset/samples/` |
| `knowledge_base_id`| No | Create a new assessment-specific knowledge base if not provided; duplicate its configuration to create an assessment KB if provided |
|`chat_id`| No | Default Auto-Select Default Chat Model |
|`rerank_id`| No | Default Auto-Select Default Rerank Model |

Task ID by`utils.GenerateTaskID`Generated in the format`evaluation_{tenantID}_{毫秒时间戳}_{8 位随机串}_{datasetID}`, each creation is different and should be queried with the ID in the creation response. The task object (`internal/types/evaluation.go`）：

```go
type EvaluationTask struct {
    ID        string           `json:"id"`
    TenantID  uint64           `json:"tenant_id"`
    DatasetID string           `json:"dataset_id"`
    StartTime time.Time        `json:"start_time"`
    Status    EvaluationStatue `json:"status"`
    ErrMsg    string           `json:"err_msg,omitempty"`
    Total     int              `json:"total,omitempty"`    // 样本总数
    Finished  int              `json:"finished,omitempty"` // 已完成数
}
```Task status enumeration (note that the spelling in the source code is`EvaluationStatue`）：

```go
const (
    EvaluationStatuePending EvaluationStatue = iota // 0 待启动
    EvaluationStatueRunning                          // 1 运行中
    EvaluationStatueSuccess                          // 2 成功
    EvaluationStatueFailed                           // 3 失败
)
```The Evaluation Process`internal/application/service/evaluation.go`In, post interface * * Preparation for synchronous completion, asynchronous execution evaluation * *:

1. * * Knowledge Base Preparation * *: Newly created (or cloned according to the reference KB configuration) to evaluate the dedicated knowledge base, taking the default Embedding and LLM models;
2. * * Parameter assembly * *: assembly from system configuration`ChatManage`PARAMETERS OF ASSESSMENT`VectorThreshold`、`KeywordThreshold`、`EmbeddingTopK`、`RerankTopK`、`RerankThreshold`、`MaxRounds`、`SummaryConfig`(MaxTokens/TopK/TopP/RepeatPenalty/Prompt/ContextTemplate, etc.),`FallbackResponse`, rewrite prompt words, etc.;
3. * * Task registration * *: Register to the memory storage with the task ID, status`Pending`, immediately return a response;
4. * * Background execution * * (goroutine): The dataset corpus is fed into the evaluation KB → and each QA is evaluated in parallel to → clean up the resources for the → aggregated indicators.

Concurrent degree fetching`max(GOMAXPROCS - 1, 1)`(errgroup current limiting):```go
var g errgroup.Group
metricHook := NewHookMetric(len(dataset))
g.SetLimit(max(runtime.GOMAXPROCS(0)-1, 1))
for i, qaPair := range dataset {
    g.Go(func() error {
        // 1. 克隆 ChatManage 配置
        // 2. 走 KnowledgeQAByEvent 完整管道（检索 + 重排 + 生成）
        // 3. 记录 MetricInput（检索到的 passage ID、生成文本、GT）
        // 4. 加锁更新 finished 进度
    })
}
g.Wait()
```One per sample produced`MetricInput`（`internal/types/evaluation.go`）：

```go
type MetricInput struct {
    RetrievalGT    [][]int // 检索 ground truth（相关 passage ID 列表）
    RetrievalIDs   []int   // 实际检索返回的 passage ID
    GeneratedTexts string  // 模型生成文本
    GeneratedGT    string  // 参考答案
}
```

`metric_hook.go`Score each sample by traversing all registered metric calculators, and finally`Avg()`Average all samples by metric, write`MetricResult`。

::: warning Caliber of RetrievalIDs`RetrievalIDs`Must be a * * passage ID in the dataset * * and cannot be used directly with the retrieved results`ChunkIndex`--The latter is only the sequence number of the block in the knowledge base, which does not correspond to the passage ID. Direct use will keep all retrieval indicators at 0.`recordFinish`Therefore, the body of each search result is bidirectionally included and matched with the ground truth passage of the sample, and the corresponding pid is found and deduplicated.When the rearrangement result is empty, the original search result is returned, and the entire sample is not marked as "nothing recalled".

Corpus filling must also * * synchronize waiting for indexing to complete * * (`CreateKnowledgeFromPassageSync`): During asynchronous warehousing, the evaluation query will run before the index is built, which also shows that the index is always 0. In addition, the passage list is pressed`maxPID + 1`Assign length, pid is 0-based and contains the last digit.
:::

# # # # Assessment Flowchart```mermaid
flowchart TD
    A["POST /api/v1/evaluation<br/>(dataset_id, knowledge_base_id, chat_id, rerank_id)"] --> B["创建评估专用知识库<br/>(新建或克隆参考 KB 配置)"]
    B --> C["装配 ChatManage 评估参数<br/>(阈值 / TopK / Summary 配置)"]
    C --> D["注册任务到内存存储<br/>ID = evaluation_{tenant}_{时间戳}_{随机串}_{dataset}, 状态 Pending"]
    D --> E["立即返回任务信息"]
    D --> F["goroutine 后台执行, 状态 Running"]
    F --> G["加载 Parquet 数据集<br/>queries / corpus / qrels / answers / qas"]
    G --> H["corpus 灌入评估知识库"]
    H --> I["errgroup 并行处理 QA 对<br/>并发 = max(CPU-1, 1)"]
    I --> J["每个问题跑 KnowledgeQAByEvent<br/>检索 + 重排 + 生成"]
    J --> K["记录 MetricInput<br/>(RetrievalIDs vs GT, 生成文本 vs 参考答案)"]
    K --> L["MetricList.Avg 汇聚 12 项指标均值"]
    L --> M["写回 EvaluationDetail, 状态 Success / Failed<br/>清理评估知识库"]
    M --> N["GET /api/v1/evaluation?task_id=...<br/>轮询进度与指标"]
```# # Implementation Reference

The following paths are relative to the repository root:

| Layer | File |
| --- | --- |
| HTTP Handler |`internal/handler/evaluation.go`|
| Assessment Services |`internal/application/service/evaluation.go`|
| Indicator Registration and Aggregation |`internal/application/service/metric_hook.go`|
| Target Achieved |`internal/application/service/metric/`（`precision.go`、`recall.go`、`ndcg.go`、`mrr.go`、`map.go`、`bleu.go`、`rouge.go`、`rouge_score.go`、`common.go`） |
| Dataset Loading |`internal/application/service/dataset.go` |
| 类型定义 | `internal/types/evaluation.go`、`internal/types/dataset.go` |
| 内置样例数据集 | `dataset/samples/`（Parquet 文件） |
| 路由注册 | `internal/router/routes_infra.go` 的 `RegisterEvaluationRoutes` |
