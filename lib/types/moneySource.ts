// MoneySource types - matching BE DTOs

export interface MoneySourceDto {
  id: string;
  userId: string;
  accountTypeId: string;
  accountTypeName: string;
  name: string;
  icon: string;
  color: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoneySourceGroupedDto {
  accountTypeId: string;
  accountTypeName: string;
  displayOrder: number;
  totalBalance: number;
  moneySources: MoneySourceDto[];
}

export interface MoneySourceGroupedResponseDto {
  totalBalance: number;
  groups: MoneySourceGroupedDto[];
}

export interface AccountTypeDto {
  id: string;
  name: string;
  icon: string;
  color: string;
  displayOrder: number;
}

export interface CurrencyDto {
  id: string;
  code: string;
  name: string;
  symbol: string;
  countryCode: string;
  displayOrder: number;
}

export interface IconDto {
  name: string;
  label: string;
}

export interface CreateMoneySourceRequest {
  accountTypeId: string;
  name: string;
  icon?: string;
  color?: string;
  balance?: number;
  currency?: string;
}

export interface UpdateMoneySourceRequest {
  accountTypeId?: string;
  name?: string;
  icon?: string;
  color?: string;
  balance?: number;
  currency?: string;
  isActive?: boolean;
}
