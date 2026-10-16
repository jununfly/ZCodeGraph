/**
 * Swift Framework Resolver
 *
 * Handles SwiftUI, UIKit, and Vapor (server-side Swift) patterns.
 *
 * Roadmap 1-4-1-17~19: framework EXTRACTION (SwiftUI `struct V: View` /
 * `@main struct A: App`, UIKit `UIViewController`/`UIView` subclasses, Vapor
 * `builder.METHOD(…, use: h)` routes + group prefixes) is Rust-owned inside
 * swift::extract (crates/zcodegraph-core/src/swift.rs); the former regex
 * extract() implementations here are retired. These resolvers keep `detect` +
 * `resolve` only; resolve() ownership is deferred to 1-4-2 like every other
 * split framework resolver.
 */

import { FrameworkResolver, UnresolvedRef, ResolvedRef, ResolutionContext } from '../types';

export const swiftUIResolver: FrameworkResolver = {
  name: 'swiftui',
  languages: ['swift'],

  detect(context: ResolutionContext): boolean {
    // Check for SwiftUI imports in Swift files
    const allFiles = context.getAllFiles();
    for (const file of allFiles) {
      if (file.endsWith('.swift')) {
        const content = context.readFile(file);
        if (content && content.includes('import SwiftUI')) {
          return true;
        }
      }
    }

    // Check for Xcode project with SwiftUI
    for (const file of allFiles) {
      if (file.endsWith('.xcodeproj') || file.endsWith('.xcworkspace')) {
        return true;
      }
    }

    return false;
  },

  resolve(ref: UnresolvedRef, context: ResolutionContext): ResolvedRef | null {
    // Pattern 1: View references (SwiftUI views are PascalCase ending in View)
    if (ref.referenceName.endsWith('View') && /^[A-Z]/.test(ref.referenceName)) {
      const result = resolveByNameAndKind(ref.referenceName, VIEW_KINDS, VIEW_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.85,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 2: ViewModel/ObservableObject references
    if (ref.referenceName.endsWith('ViewModel') || ref.referenceName.endsWith('Store') || ref.referenceName.endsWith('Manager')) {
      const result = resolveByNameAndKind(ref.referenceName, CLASS_KINDS, VIEWMODEL_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.85,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 3: Model references
    if (/^[A-Z][a-zA-Z]+$/.test(ref.referenceName)) {
      const result = resolveByNameAndKind(ref.referenceName, MODEL_KINDS, MODEL_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.7,
          resolvedBy: 'framework',
        };
      }
    }

    return null;
  },
};

export const uikitResolver: FrameworkResolver = {
  name: 'uikit',
  languages: ['swift'],

  detect(context: ResolutionContext): boolean {
    const allFiles = context.getAllFiles();
    for (const file of allFiles) {
      if (file.endsWith('.swift')) {
        const content = context.readFile(file);
        if (content && (
          content.includes('import UIKit') ||
          content.includes('UIViewController') ||
          content.includes('UIView')
        )) {
          return true;
        }
      }
    }

    return false;
  },

  resolve(ref: UnresolvedRef, context: ResolutionContext): ResolvedRef | null {
    // Pattern 1: ViewController references
    if (ref.referenceName.endsWith('ViewController')) {
      const result = resolveByNameAndKind(ref.referenceName, CLASS_KINDS, VC_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.85,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 2: UIView subclass references
    if (ref.referenceName.endsWith('View') && !ref.referenceName.endsWith('ViewController')) {
      const result = resolveByNameAndKind(ref.referenceName, CLASS_KINDS, UIVIEW_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.8,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 3: Cell references
    if (ref.referenceName.endsWith('Cell')) {
      const result = resolveByNameAndKind(ref.referenceName, CLASS_KINDS, CELL_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.85,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 4: Delegate/DataSource references
    if (ref.referenceName.endsWith('Delegate') || ref.referenceName.endsWith('DataSource')) {
      const result = resolveByNameAndKind(ref.referenceName, PROTOCOL_KINDS, [], context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.8,
          resolvedBy: 'framework',
        };
      }
    }

    return null;
  },
};

export const vaporResolver: FrameworkResolver = {
  name: 'vapor',
  languages: ['swift'],

  detect(context: ResolutionContext): boolean {
    // Check for Package.swift with Vapor dependency
    const packageSwift = context.readFile('Package.swift');
    if (packageSwift && packageSwift.includes('vapor')) {
      return true;
    }

    // Check for Vapor imports
    const allFiles = context.getAllFiles();
    for (const file of allFiles) {
      if (file.endsWith('.swift')) {
        const content = context.readFile(file);
        if (content && content.includes('import Vapor')) {
          return true;
        }
      }
    }

    return false;
  },

  resolve(ref: UnresolvedRef, context: ResolutionContext): ResolvedRef | null {
    // Pattern 1: Controller references
    if (ref.referenceName.endsWith('Controller')) {
      const result = resolveByNameAndKind(ref.referenceName, VAPOR_CONTROLLER_KINDS, VAPOR_CONTROLLER_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.85,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 2: Model references (Fluent)
    if (/^[A-Z][a-zA-Z]+$/.test(ref.referenceName)) {
      const result = resolveByNameAndKind(ref.referenceName, CLASS_KINDS, FLUENT_MODEL_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.75,
          resolvedBy: 'framework',
        };
      }
    }

    // Pattern 3: Middleware references
    if (ref.referenceName.endsWith('Middleware')) {
      const result = resolveByNameAndKind(ref.referenceName, VAPOR_CONTROLLER_KINDS, VAPOR_MIDDLEWARE_DIRS, context);
      if (result) {
        return {
          original: ref,
          targetNodeId: result,
          confidence: 0.8,
          resolvedBy: 'framework',
        };
      }
    }

    return null;
  },
};

// Directory patterns
const VIEW_DIRS = ['/Views/', '/View/', '/Screens/', '/Components/', '/UI/'];
const VIEWMODEL_DIRS = ['/ViewModels/', '/ViewModel/', '/Stores/', '/Managers/', '/Services/'];
const MODEL_DIRS = ['/Models/', '/Model/', '/Entities/', '/Domain/'];
const VC_DIRS = ['/ViewControllers/', '/ViewController/', '/Controllers/', '/Screens/'];
const UIVIEW_DIRS = ['/Views/', '/View/', '/UI/', '/Components/'];
const CELL_DIRS = ['/Cells/', '/Cell/', '/Views/', '/TableViewCells/', '/CollectionViewCells/'];
const VAPOR_CONTROLLER_DIRS = ['/Controllers/', '/Controller/', '/Routes/'];
const FLUENT_MODEL_DIRS = ['/Models/', '/Model/', '/Entities/', '/Database/'];
const VAPOR_MIDDLEWARE_DIRS = ['/Middleware/', '/Middlewares/'];

const VIEW_KINDS = new Set(['struct', 'component']);
const CLASS_KINDS = new Set(['class']);
const MODEL_KINDS = new Set(['struct', 'class']);
const PROTOCOL_KINDS = new Set(['protocol']);
const VAPOR_CONTROLLER_KINDS = new Set(['class', 'struct']);

/**
 * Resolve a symbol by name using indexed queries instead of scanning all files.
 */
function resolveByNameAndKind(
  name: string,
  kinds: Set<string>,
  preferredDirPatterns: string[],
  context: ResolutionContext,
): string | null {
  const candidates = context.getNodesByName(name);
  if (candidates.length === 0) return null;

  const kindFiltered = candidates.filter((n) => kinds.has(n.kind));
  if (kindFiltered.length === 0) return null;

  // Prefer candidates in framework-conventional directories
  if (preferredDirPatterns.length > 0) {
    const preferred = kindFiltered.filter((n) =>
      preferredDirPatterns.some((d) => n.filePath.includes(d))
    );
    if (preferred.length > 0) return preferred[0]!.id;
  }

  // Fall back to any match
  return kindFiltered[0]!.id;
}
