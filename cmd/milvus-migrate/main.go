// milvus-migrate 将旧版 Milvus Collection 复制为支持中英文 BM25 的新 Collection。
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"time"

	milvusRepo "github.com/Tencent/WeKnora/internal/application/repository/retriever/milvus"
	client "github.com/milvus-io/milvus/client/v2/milvusclient"
)

func main() {
	sourceDefault := strings.TrimSpace(os.Getenv("MILVUS_COLLECTION"))
	if sourceDefault == "" {
		sourceDefault = "weknora_embeddings"
	}
	targetDefault := sourceDefault + "_multilingual"

	source := flag.String("source", sourceDefault, "Préfixe de l'ancienne Collection, par exemple weknora_embeddings")
	target := flag.String("target", targetDefault, "Préfixe de la nouvelle Collection, par exemple "+
		"weknora_embeddings_multilingual")
	address := flag.String("address", envOr("MILVUS_ADDRESS", "localhost:19530"), "Adresse Milvus")
	username := flag.String("username", os.Getenv("MILVUS_USERNAME"), "Nom d'utilisateur Milvus")
	password := flag.String("password", os.Getenv("MILVUS_PASSWORD"), "Mot de passe Milvus")
	database := flag.String("database", os.Getenv("MILVUS_DB_NAME"), "Nom de la base Milvus")
	metric := flag.String(
		"metric-type",
		strings.TrimSpace(os.Getenv("MILVUS_METRIC_TYPE")),
		"Distance des vecteurs denses : IP, COSINE ou L2 ; si omis, reprend celle de la Collection source",
	)
	batchSize := flag.Int("batch-size", 64, "Nombre de lignes migrées par lot ; réduisez-le si les textes sont longs")
	flag.Parse()

	metricType, err := milvusRepo.ParseMetricType(*metric)
	if err != nil {
		log.Fatal(err)
	}
	if strings.TrimSpace(*source) == strings.TrimSpace(*target) {
		log.Fatal("--source et --target doivent être différents ; la migration copie vers une nouvelle Collection " +
			"sans jamais écraser l'ancienne")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	connectCtx, cancelConnect := context.WithTimeout(ctx, 30*time.Second)
	milvusClient, err := client.New(connectCtx, &client.ClientConfig{
		Address:  *address,
		Username: *username,
		Password: *password,
		DBName:   *database,
	})
	cancelConnect()
	if err != nil {
		log.Fatalf("Échec de connexion à Milvus : %v", err)
	}
	defer func() {
		closeCtx, cancelClose := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancelClose()
		if err := milvusClient.Close(closeCtx); err != nil {
			log.Printf("Échec de fermeture de la connexion Milvus : %v", err)
		}
	}()

	summary, err := milvusRepo.MigrateLegacyCollections(ctx, milvusClient, milvusRepo.MultilingualMigrationOptions{
		SourceCollectionBaseName: *source,
		TargetCollectionBaseName: *target,
		MetricType:               metricType,
		BatchSize:                *batchSize,
	})
	if err != nil {
		log.Fatalf(
			"Échec de la migration (%d Collection(s) vérifiée(s), %d Collection(s) copiée(s), %d ligne(s)) : %v",
			summary.ExaminedCollections,
			summary.MigratedCollections,
			summary.MigratedRows,
			err,
		)
	}
	fmt.Printf(
		"Migration terminée : %d Collection(s) vérifiée(s), %d Collection(s) copiée(s), %d ligne(s). Les "+
			"anciennes Collections sont conservées.\n",
		summary.ExaminedCollections,
		summary.MigratedCollections,
		summary.MigratedRows,
	)
}

func envOr(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}
