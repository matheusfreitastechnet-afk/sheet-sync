import React, { useState, useMemo } from 'react';
import { Table, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { getActivityStatus } from '@/utils/activityHelpers';


type SortOrder = 'none' | 'asc' | 'desc';

export const DataTable: React.FC = () => {
  const { filteredData } = useDashboard();

  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  const sortedData = useMemo(() => {
    if (sortOrder === 'none') return filteredData;

    return [...filteredData].sort((a, b) => {
      const recursoA = (a.Recurso || '').toString().toLowerCase();
      const recursoB = (b.Recurso || '').toString().toLowerCase();

      if (sortOrder === 'asc') {
        return recursoA.localeCompare(recursoB, 'pt-BR');
      } else {
        return recursoB.localeCompare(recursoA, 'pt-BR');
      }
    });
  }, [filteredData, sortOrder]);

  const toggleSort = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Produtiva':
        return '#43e97b';
      case 'Improdutiva':
        return '#f5576c';
      default:
        return '#f5a623';
    }
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <h3 className="table-title">
          <Table className="w-5 h-5" />
          Análise Detalhada
        </h3>
        <span className="record-count">
          {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th 
                onClick={toggleSort}
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                title={sortOrder === 'none' ? 'Ordenar A-Z' : sortOrder === 'asc' ? 'Ordenar Z-A' : 'Remover ordenação'}
              >
                <div className="flex items-center gap-2">
                  Recurso
                  {sortOrder === 'asc' && <ArrowUpAZ className="w-4 h-4 text-primary" />}
                  {sortOrder === 'desc' && <ArrowDownAZ className="w-4 h-4 text-primary" />}
                  {sortOrder === 'none' && <ArrowUpAZ className="w-4 h-4 opacity-30" />}
                </div>
              </th>
              <th>Tipo de Atividade</th>
              <th>Contrato</th>
              <th>Cód de Baixa 1</th>
              <th>Status</th>
              <th>Intervalo de Tempo</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhum dado para exibir
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => {
                const status = getActivityStatus(item);
                return (
                  <tr key={index}>
                    <td>{item.Recurso || 'N/A'}</td>
                    <td>{item['Tipo de Atividade'] || 'N/A'}</td>
                    <td>{item.Contrato || item.contrato || 'N/A'}</td>
                    <td>{item['Cód de Baixa 1'] || 'N/A'}</td>
                    <td>
                      <span style={{ color: getStatusColor(status), fontWeight: 600 }}>
                        {status}
                      </span>
                    </td>
                    <td>{item['Intervalo de Tempo'] || 'N/A'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
