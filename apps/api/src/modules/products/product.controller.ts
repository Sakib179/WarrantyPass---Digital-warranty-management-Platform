import type { Request, Response } from 'express';
import type { ProductService } from './product.service.js';
import { extractBusinessAuth } from '../../common/middleware/authorization.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import { AppError } from '../../common/errors/app-error.js';

export class ProductController {
  public constructor(private readonly productService: ProductService) {}

  public handleError(fn: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        await fn(req, res);
      } catch (error) {
        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            error: { code: error.code, message: error.message, details: error.details },
          });
          return;
        }
        throw error;
      }
    };
  }

  public listProducts = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const { search, categoryId, brandId, status } = req.query;
    const products = await this.productService.listProducts(auth, {
      ...(search ? { search: String(search) } : {}),
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
      ...(brandId ? { brandId: String(brandId) } : {}),
      ...(status ? { status: String(status) } : {}),
    });
    res.json({ success: true, data: products, meta: {} });
  };

  public getProduct = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const productId = req.params.productId as string;
    const product = await this.productService.getProductById(auth, productId);
    res.json({ success: true, data: product, meta: {} });
  };

  public createProduct = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const product = await this.productService.createProduct(auth, req.body, metadata);
    res.status(201).json({ success: true, data: product, meta: {} });
  };

  public updateProduct = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const productId = req.params.productId as string;
    const product = await this.productService.updateProduct(auth, productId, req.body, metadata);
    res.json({ success: true, data: product, meta: {} });
  };

  public archiveProduct = async (req: Request, res: Response): Promise<void> => {
    const auth = extractBusinessAuth(req);
    const metadata = requestMetadata(req);
    const productId = req.params.productId as string;
    const product = await this.productService.archiveProduct(auth, productId, metadata);
    res.json({ success: true, data: product, meta: {} });
  };
}
