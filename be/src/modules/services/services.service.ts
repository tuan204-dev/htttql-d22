import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
  ) {}

  async findAll(activeOnly = true): Promise<Service[]> {
    return this.serviceRepo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async create(dto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepo.create({
      name: dto.name,
      category: dto.category,
      unitPrice: dto.unitPrice.toString(),
      unit: dto.unit,
      stock: dto.stock ?? 0,
      isActive: true,
    });
    return this.serviceRepo.save(service);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findById(id);
    if (dto.name !== undefined) service.name = dto.name;
    if (dto.category !== undefined) service.category = dto.category;
    if (dto.unitPrice !== undefined)
      service.unitPrice = dto.unitPrice.toString();
    if (dto.unit !== undefined) service.unit = dto.unit;
    if (dto.stock !== undefined) service.stock = dto.stock;
    return this.serviceRepo.save(service);
  }

  async remove(id: string): Promise<{ id: string; isActive: boolean }> {
    const service = await this.findById(id);
    service.isActive = false;
    await this.serviceRepo.save(service);
    return { id, isActive: false };
  }

  async decreaseStock(serviceId: string, quantity: number): Promise<Service> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    const service = await this.findById(serviceId);
    if (service.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for service ${service.name}`,
      );
    }
    service.stock -= quantity;
    return this.serviceRepo.save(service);
  }
}
