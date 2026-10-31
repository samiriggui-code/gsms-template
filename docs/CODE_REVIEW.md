# Revue de code avant merge (CodeRabbit)

Pour les changements WeKnora / extensions Tencent :

1. **Branche** : une feature par connecteur (`feat/tencent-meeting-connector`, etc.).
2. **Avant PR / merge** : lancer CodeRabbit sur les changements locaux :

   ```bash
   coderabbit review --agent --uncommitted
   ```

   Pour tout le connecteur Meeting :

   ```bash
   coderabbit review --agent --dir internal/tencentmeeting
   ```

3. **Corriger** au minimum les findings **critical** et **major** ; documenter les exceptions.
4. **CI** : ouvrir une PR GitHub — CodeRabbit commente automatiquement si le repo est lié au compte.

Authentification : `coderabbit auth login` (une fois par machine). Ne pas committer de secrets ; `--include-untracked` exclut `.env`.

Configuration repo : [`.coderabbit.yaml`](../.coderabbit.yaml).
