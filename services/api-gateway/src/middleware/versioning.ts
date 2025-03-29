import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@novamind/shared/utils/error-handling';

export interface VersionedRoute {
  version: string;
  handler: (req: Request, res: Response, next: NextFunction) => void;
}

export class VersionRouter {
  private routes: Map<string, VersionedRoute[]> = new Map();

  /**
   * Register a versioned route handler
   */
  public registerRoute(path: string, version: string, handler: (req: Request, res: Response, next: NextFunction) => void): void {
    if (!this.routes.has(path)) {
      this.routes.set(path, []);
    }
    
    const routeHandlers = this.routes.get(path)!;
    routeHandlers.push({ version, handler });
    
    // Sort handlers by version (newest first)
    routeHandlers.sort((a, b) => this.compareVersions(b.version, a.version));
  }

  /**
   * Get the appropriate handler for a request
   */
  public getHandler(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;
    const requestedVersion = this.getRequestedVersion(req);
    
    const routeHandlers = this.routes.get(path);
    if (!routeHandlers || routeHandlers.length === 0) {
      next();
      return;
    }

    // Find the best matching version
    const handler = this.findBestVersion(routeHandlers, requestedVersion);
    if (!handler) {
      throw new ValidationError(
        `No compatible version found for ${path}. Supported versions: ${routeHandlers.map(r => r.version).join(', ')}`
      );
    }

    handler(req, res, next);
  }

  /**
   * Extract version from request
   */
  private getRequestedVersion(req: Request): string {
    // Check Accept header first
    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/version=(\d+\.\d+)/);
      if (versionMatch) {
        return versionMatch[1];
      }
    }

    // Check URL parameter
    const urlVersion = req.query.version as string;
    if (urlVersion) {
      return urlVersion;
    }

    // Default to latest version
    return '1.0';
  }

  /**
   * Find the best matching version
   */
  private findBestVersion(handlers: VersionedRoute[], requestedVersion: string): ((req: Request, res: Response, next: NextFunction) => void) | null {
    // Exact match
    const exactMatch = handlers.find(h => h.version === requestedVersion);
    if (exactMatch) {
      return exactMatch.handler;
    }

    // Find the latest compatible version
    const [major, minor] = requestedVersion.split('.').map(Number);
    
    for (const handler of handlers) {
      const [handlerMajor, handlerMinor] = handler.version.split('.').map(Number);
      
      // Major version must match
      if (handlerMajor === major) {
        // Minor version must be less than or equal to requested
        if (handlerMinor <= minor) {
          return handler.handler;
        }
      }
    }

    return null;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const [major1, minor1] = v1.split('.').map(Number);
    const [major2, minor2] = v2.split('.').map(Number);

    if (major1 !== major2) {
      return major1 - major2;
    }

    return minor1 - minor2;
  }
}

export function validateVersion(req: Request, _res: Response, next: NextFunction) {
  const version = req.headers['x-api-version'];
  
  if (!version) {
    next(new ValidationError('API version header is required'));
    return;
  }

  // Validate version format (e.g., "v1", "v2")
  if (!/^v\d+$/.test(version as string)) {
    next(new ValidationError('Invalid API version format'));
    return;
  }

  next();
} 