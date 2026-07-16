import type { ElementType } from 'react';
import {
  Box,
  Flex,
  Text,
  Card,
  CardBody,
  CardFooter,
  Tag,
  TagGroup,
  ButtonIcon,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiDownloadLine, RiExternalLinkLine } from '@remixicon/react';
import {
  RiArticleLine,
  RiRobot2Line,
  RiToolsLine,
  RiGitBranchLine,
} from '@remixicon/react';
import type {
  AiAssetSummary,
  AssetType,
  AiTool,
} from '@nospt/plugin-dev-ai-hub-common';
import { ToolIcon } from '../ToolIcon';
import styles from './AssetCard.module.css';

const POPULAR_THRESHOLD = 5;
const NEW_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const TOOL_LABELS: Record<AiTool, string> = {
  all: 'Universal',
  'claude-code': 'Claude Code',
  'github-copilot': 'GitHub Copilot',
  'google-gemini': 'Google Gemini',
  cursor: 'Cursor',
};

const TYPE_CONFIG: Record<
  AssetType,
  { label: string; color: string; bg: string; Icon: ElementType }
> = {
  instruction: {
    label: 'Instruction',
    color: '#54A0FF',
    bg: 'rgba(84, 160, 255, 0.15)',
    Icon: RiArticleLine,
  },
  agent: {
    label: 'Agent',
    color: '#FF6B9D',
    bg: 'rgba(255, 107, 157, 0.15)',
    Icon: RiRobot2Line,
  },
  skill: {
    label: 'Skill',
    color: '#6AB04C',
    bg: 'rgba(106, 176, 76, 0.15)',
    Icon: RiToolsLine,
  },
  workflow: {
    label: 'Workflow',
    color: '#F9CA24',
    bg: 'rgba(249, 202, 36, 0.15)',
    Icon: RiGitBranchLine,
  },
};

interface AssetCardProps {
  asset: AiAssetSummary;
  onView: (id: string) => void;
  onInstall: (id: string) => void;
}

export function AssetCard({ asset, onView, onInstall }: AssetCardProps) {
  const cfg = TYPE_CONFIG[asset.type];
  const TypeIcon = cfg.Icon;
  const isPopular = asset.installCount >= POPULAR_THRESHOLD;
  const isNew = Date.now() - new Date(asset.updatedAt).getTime() < NEW_DAYS_MS;

  return (
    <Card
      className={styles.card}
      style={{ '--card-accent': cfg.color } as React.CSSProperties}
    >
      <CardBody className={styles.cardContent}>
        {/* Header */}
        <Flex className={styles.header}>
          <Box className={styles.iconBox} style={{ backgroundColor: cfg.bg }}>
            {asset.icon ? (
              <img
                src={asset.icon}
                alt={asset.label ?? asset.name}
                className={styles.iconImage}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <TypeIcon size={18} style={{ color: cfg.color }} />
            )}
          </Box>

          <Box className={styles.headerInfo}>
            <Flex className={styles.titleRow}>
              <Text
                variant="body-medium"
                weight="bold"
                className={styles.title}
                title={asset.label ?? asset.name}
              >
                {asset.label ?? asset.name}
              </Text>
              {isNew && (
                <TagGroup aria-label="Status">
                  <Tag id="new" size="small" className={styles.newBadge}>
                    New
                  </Tag>
                </TagGroup>
              )}
            </Flex>
            <Text
              variant="body-x-small"
              style={{ color: cfg.color, fontWeight: 600 }}
            >
              {cfg.label}
            </Text>
          </Box>
        </Flex>

        {/* Description */}
        <Text
          variant="body-x-small"
          color="secondary"
          className={styles.description}
        >
          {asset.description}
        </Text>

        {/* Tools */}
        <TagGroup
          aria-label="Compatible tools"
          className={`${styles.toolsRow} ${
            asset.tags.length > 0 ? styles.toolsRowWithTags : ''
          }`}
        >
          {asset.tools.map(tool => (
            <Tag
              key={tool}
              id={tool}
              size="small"
              className={styles.toolChip}
              icon={<ToolIcon tool={tool as AiTool} size={12} />}
            >
              {TOOL_LABELS[tool as AiTool] ?? tool}
            </Tag>
          ))}
        </TagGroup>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <>
            <TagGroup aria-label="Tags" className={styles.tagsRow}>
              {asset.tags.slice(0, 3).map(tag => (
                <Tag key={tag} id={tag} size="small" className={styles.tagChip}>
                  #{tag}
                </Tag>
              ))}
            </TagGroup>
            {asset.tags.length > 3 && (
              <Text
                variant="body-x-small"
                color="secondary"
                style={{ alignSelf: 'center' }}
              >
                +{asset.tags.length - 3}
              </Text>
            )}
          </>
        )}
      </CardBody>

      <CardFooter className={styles.cardActions}>
        <Flex className={styles.metaRow}>
          <Text
            variant="body-x-small"
            color="secondary"
            className={styles.metaText}
          >
            v{asset.version} · {asset.author}
          </Text>
          {asset.installCount > 0 && (
            <Flex className={styles.installCountRow}>
              <Text className={styles.installEmoji}>
                {isPopular ? '🔥' : '↓'}
              </Text>
              <Text
                variant="body-x-small"
                color="secondary"
                className={styles.metaText}
              >
                {asset.installCount}
              </Text>
            </Flex>
          )}
        </Flex>
        <Flex className={styles.actionsRow}>
          <TooltipTrigger>
            <ButtonIcon
              aria-label="Install in editor"
              icon={<RiDownloadLine size={16} />}
              variant="tertiary"
              onPress={() => onInstall(asset.id)}
            />
            <Tooltip>Install in editor</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <ButtonIcon
              aria-label="View details"
              icon={<RiExternalLinkLine size={16} />}
              variant="tertiary"
              onPress={() => onView(asset.id)}
            />
            <Tooltip>View details</Tooltip>
          </TooltipTrigger>
        </Flex>
      </CardFooter>
    </Card>
  );
}
