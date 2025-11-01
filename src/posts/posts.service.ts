import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostPrivacy } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { S3Service } from '../s3/s3.service';
import * as sharp from 'sharp';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private s3Service: S3Service,
  ) {}

  async create(
    createPostDto: CreatePostDto,
    userId: number,
    file?: Express.Multer.File,
  ): Promise<Post> {
    const post = new Post();
    post.text = createPostDto.text;
    post.hashtags = createPostDto.hashtags || [];
    post.privacy = createPostDto.privacy || PostPrivacy.PUBLIC;
    post.userId = userId;

    if (file) {
      let fileToUpload = file.buffer;
      let mimeType = file.mimetype;

      // Сжимаем только изображения
      if (file.mimetype.startsWith('image/')) {
        fileToUpload = await this.compressImage(file.buffer);
        mimeType = 'image/webp';
      }

      // Загружаем в S3 и получаем URL
      const fileUrl = await this.s3Service.uploadFile(
        fileToUpload,
        mimeType,
        'posts',
      );

      post.mediaUrl = fileUrl;
      post.mediaMimeType = mimeType;
    }

    return await this.postsRepository.save(post);
  }

  private async compressImage(buffer: Buffer): Promise<Buffer> {
    return await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }

  async findAll(): Promise<Post[]> {
    return await this.postsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Post | null> {
    return await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: number): Promise<Post[]> {
    return await this.postsRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    userId: number,
    file?: Express.Multer.File,
  ): Promise<Post> {
    const post = await this.findOne(id);
    
    if (!post) {
      throw new NotFoundException('Пост не найден');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('У вас нет прав на редактирование этого поста');
    }

    // Обновляем поля
    if (updatePostDto.text !== undefined) {
      post.text = updatePostDto.text;
    }
    if (updatePostDto.hashtags !== undefined) {
      post.hashtags = updatePostDto.hashtags;
    }
    if (updatePostDto.privacy !== undefined) {
      post.privacy = updatePostDto.privacy;
    }

    // Обновляем медиа если передан новый файл
    if (file) {
      // Удаляем старый файл из S3, если он был
      if (post.mediaUrl) {
        await this.s3Service.deleteFile(post.mediaUrl);
      }

      let fileToUpload = file.buffer;
      let mimeType = file.mimetype;

      if (file.mimetype.startsWith('image/')) {
        fileToUpload = await this.compressImage(file.buffer);
        mimeType = 'image/webp';
      }

      const fileUrl = await this.s3Service.uploadFile(
        fileToUpload,
        mimeType,
        'posts',
      );

      post.mediaUrl = fileUrl;
      post.mediaMimeType = mimeType;
    }

    return await this.postsRepository.save(post);
  }

  async remove(id: number, userId: number): Promise<void> {
    const post = await this.findOne(id);
    
    if (!post) {
      throw new NotFoundException('Пост не найден');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('У вас нет прав на удаление этого поста');
    }

    // Удаляем медиа файл из S3, если он есть
    if (post.mediaUrl) {
      await this.s3Service.deleteFile(post.mediaUrl);
    }

    await this.postsRepository.remove(post);
  }
}

