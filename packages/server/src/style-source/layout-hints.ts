import type { UiInspectCssDebugTarget, UiInspectLayoutHint } from '@ui-inspect/protocol';

const LAYOUT_PROPERTIES = new Set([
  'justify-content', 'align-items', 'align-content', 'align-self',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'display', 'position', 'top', 'right', 'bottom', 'left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'transform',
]);

const SIZE_PROPERTIES = new Set(['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height']);

const TYPOGRAPHY_PROPERTIES = new Set(['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color']);

export function buildLayoutHints(target: UiInspectCssDebugTarget): UiInspectLayoutHint[] {
  const hints: UiInspectLayoutHint[] = [];
  const interaction = target.primaryInteraction;
  const changedProps = Object.keys(target.changedStyles);

  if (!interaction) return hints;

  // Transform-based move interaction
  if (interaction.type === 'move' && target.changedStyles.transform) {
    // Suggest using margin instead of transform for persistent changes
    const parentDisplay = target.layoutContext?.parent?.styles?.display;
    
    if (parentDisplay === 'grid') {
      hints.push({
        suggestedProperty: 'justify-self',
        reason: 'For grid containers, justify-self can control horizontal alignment.',
        confidence: 0.8,
      });
      
      hints.push({
        suggestedProperty: 'margin-left',
        reason: 'For layout adjustments in flex/grid containers, prefer margin over transform.',
        confidence: 0.7,
      });
    } else if (parentDisplay === 'flex') {
      hints.push({
        suggestedProperty: 'margin-left',
        reason: 'For layout adjustments in flex/grid containers, prefer margin over transform.',
        confidence: 0.78,
      });
      
      hints.push({
        suggestedProperty: 'align-self',
        reason: 'For flex containers, align-self can control positioning without margin.',
        confidence: 0.7,
      });
      
      hints.push({
        suggestedProperty: 'justify-content',
        reason: 'Consider adjusting the container\'s justify-content for layout changes.',
        confidence: 0.65,
      });
    } else {
      hints.push({
        suggestedProperty: 'margin-left',
        reason: 'Prefer margin over transform for persistent layout changes.',
        confidence: 0.8,
      });
      
      // Check element's original position, not parent's
      const elementPosition = target.originalStyles?.position as string | undefined;
      if (elementPosition === 'relative') {
        hints.push({
          suggestedProperty: 'left',
          reason: 'For position: relative, consider using left instead of transform.',
          confidence: 0.75,
        });
        
        hints.push({
          suggestedProperty: 'top',
          reason: 'For position: relative, consider using top instead of transform.',
          confidence: 0.75,
        });
      }
    }
  }

  // Resize interaction
  if (interaction.type === 'resize') {
    // Infer axis from handle if not explicitly provided
    let axis = interaction.axis;
    if (!axis && interaction.handle) {
      // Handle can be: n, s, e, w, ne, nw, se, sw
      // n/s = vertical (y), e/w = horizontal (x)
      const horizontalHandles = ['e', 'w', 'ne', 'nw', 'se', 'sw'];
      axis = horizontalHandles.includes(interaction.handle) ? 'x' : 'y';
    }
    
    const sizeProp = axis === 'x' ? 'width' : 'height';
    
    // Check if the size property was actually changed
    if (changedProps.includes(sizeProp)) {
      hints.push({
        suggestedProperty: sizeProp,
        reason: `The element was resized. Consider setting ${sizeProp} explicitly.`,
        confidence: 0.85,
      });
      
      if (target.layoutContext?.parent?.styles?.display === 'flex') {
        hints.push({
          suggestedProperty: 'flex-basis',
          reason: 'In flex containers, flex-basis can control the initial main size.',
          confidence: 0.7,
        });
        
        hints.push({
          suggestedProperty: 'flex-grow',
          reason: 'In flex containers, flex-grow controls how the element grows.',
          confidence: 0.7,
        });
      }
      
      if (target.layoutContext?.parent?.styles?.display === 'grid') {
        hints.push({
          suggestedProperty: 'grid-column',
          reason: 'In grid containers, adjust grid-column for spanning.',
          confidence: 0.75,
        });
      }
    }
  }

  // Font size change
  if (changedProps.some(p => TYPOGRAPHY_PROPERTIES.has(p))) {
    hints.push({
      suggestedProperty: 'font-size',
      reason: 'Typography properties were changed. Consider using a font-size scale.',
      confidence: 0.7,
    });
  }

  return hints;
}
