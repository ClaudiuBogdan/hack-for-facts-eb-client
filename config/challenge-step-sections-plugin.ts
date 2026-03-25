import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import {
  buildChallengeStepSectionMetadataManifest,
  buildChallengeStepSectionRequestId,
  isChallengeStepMdxFile,
  parseChallengeStepSectionRequestId,
  transformSectionedChallengeStepSource,
} from "../src/features/challenges/utils/sectioned-step-markdown.build";

export const challengeStepSectionMetadataModuleId =
  "virtual:challenge-step-section-metadata";

const resolvedChallengeStepSectionMetadataModuleId =
  `\0${challengeStepSectionMetadataModuleId}`;

function normalizeFilePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function toProjectImportPath(projectRoot: string, filePath: string) {
  const relativePath = path.relative(projectRoot, filePath);
  return `/${normalizeFilePath(relativePath)}`;
}

function collectChallengeStepFiles(directoryPath: string): string[] {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectChallengeStepFiles(entryPath);
    }

    return /index\.(en|ro)\.mdx$/.test(entry.name) ? [entryPath] : [];
  });
}

function buildChallengeStepMetadataModuleSource(projectRoot: string) {
  const challengeStepFiles = collectChallengeStepFiles(
    path.resolve(projectRoot, "src/content/challenges/steps"),
  );
  const metadataManifest = buildChallengeStepSectionMetadataManifest({
    files: challengeStepFiles.map((filePath) => ({
      filePath: toProjectImportPath(projectRoot, filePath),
      source: fs.readFileSync(filePath, "utf8"),
    })),
  });

  return `const challengeStepSectionMetadata = ${JSON.stringify(
    metadataManifest,
  )};\nexport default challengeStepSectionMetadata;\n`;
}

export function createChallengeStepSectionsPlugin(): Plugin {
  const challengeStepSectionSources = new Map<string, string>();
  let projectRoot = process.cwd();

  return {
    name: "challenge-step-sections",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(id) {
      if (id === challengeStepSectionMetadataModuleId) {
        return resolvedChallengeStepSectionMetadataModuleId;
      }

      return null;
    },
    load(id) {
      if (id === resolvedChallengeStepSectionMetadataModuleId) {
        return buildChallengeStepMetadataModuleSource(projectRoot);
      }

      const sectionRequest = parseChallengeStepSectionRequestId(id);
      if (!sectionRequest) {
        return null;
      }

      return challengeStepSectionSources.get(
        buildChallengeStepSectionRequestId(
          sectionRequest.filePath,
          sectionRequest.sectionIndex,
        ),
      ) ?? null;
    },
    transform(code, id) {
      if (parseChallengeStepSectionRequestId(id)) {
        return null;
      }

      const normalizedId = normalizeFilePath(id);
      if (!isChallengeStepMdxFile(normalizedId)) {
        return null;
      }

      const transformed = transformSectionedChallengeStepSource({
        source: code,
        filePath: normalizedId,
      });
      if (!transformed.didTransform) {
        return null;
      }

      transformed.sections.forEach((section, sectionIndex) => {
        challengeStepSectionSources.set(
          buildChallengeStepSectionRequestId(normalizedId, sectionIndex),
          section.bodySource,
        );
      });

      return {
        code: transformed.source,
        map: null,
      };
    },
  };
}
