import { Injectable, Inject, Logger, InternalServerErrorException } from "@nestjs/common";
import { Image } from "../image.entity";
import { ImagesService } from "./images.service";
import { TransformImageServiceToken, SaveImageServiceToken } from "../constants";
import { TransformImageService } from "./transform-image.service";
import { SaveImageService } from "./save-image.service";
import { CreateImageDto } from "../dto/create-image.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class PodsImagesService implements ImagesService {
    private readonly transformImageService: TransformImageService;
    private readonly saveImageService: SaveImageService;
    private readonly imageRepository: Repository<Image>;

    constructor(@Inject(TransformImageServiceToken) transformImageService: TransformImageService,
                @Inject(SaveImageServiceToken) saveImageService: SaveImageService,
                @InjectRepository(Image) imageRepository: Repository<Image>) {
        this.transformImageService = transformImageService;
        this.saveImageService = saveImageService;
        this.imageRepository = imageRepository;
    }

    async findImageByFilename(filename: string): Promise<Image> {
        return await this.imageRepository.findOne({ filename });
    }
 
    async uploadImage(image: Express.Multer.File): Promise<Image> {
        const createImageFilesDto = await this.transformImageService.transform(image);
        
        let savedImage;
        try {
            savedImage = await this.saveImageService.save(createImageFilesDto);
        } catch(e) {
            Logger.error(`Cannot save image ${image} to local drive: ${e.message}`, e.stack)
            throw new InternalServerErrorException();
        }

        return await this.create(savedImage);
    }

    async create(image: CreateImageDto): Promise<Image> {
        try {
            const createdImage = await this.imageRepository.create(image);
            return await this.imageRepository.save(createdImage);
        } catch(e) {
            Logger.error(`Cannot save image ${image} to database: ${e.message}`, e.stack)
            throw new InternalServerErrorException();       
        }
    }
}