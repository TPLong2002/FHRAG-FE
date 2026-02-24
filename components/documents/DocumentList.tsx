"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Table, ConfigProvider, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
import { deleteDocument } from "@/lib/api";
import type { DocumentMeta } from "@/types";

interface Props {
  documents: DocumentMeta[];
  loading: boolean;
  onDelete: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResizableTitle(
  props: React.HTMLAttributes<HTMLTableCellElement> & {
    onResize?: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
    width?: number;
  },
) {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            position: "absolute",
            right: -5,
            bottom: 0,
            top: 0,
            width: 10,
            cursor: "col-resize",
            zIndex: 1,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
}

export default function DocumentList({ documents, loading, onDelete }: Props) {
  const [columns, setColumns] = useState<ColumnsType<DocumentMeta>>([
    {
      title: "File",
      dataIndex: "fileName",
      key: "fileName",
      width: 250,
      ellipsis: true,
    },
    {
      title: "Type",
      dataIndex: "fileType",
      key: "fileType",
      width: 80,
      render: (v: string) => <span className="uppercase">{v}</span>,
    },
    {
      title: "Size",
      dataIndex: "fileSize",
      key: "fileSize",
      width: 100,
      render: (v: number) => formatSize(v),
    },
    {
      title: "Chunks",
      dataIndex: "totalChunks",
      key: "totalChunks",
      width: 90,
    },
    {
      title: "Embedding",
      dataIndex: "embeddingModel",
      key: "embeddingModel",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Uploaded",
      dataIndex: "uploadedAt",
      key: "uploadedAt",
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_: unknown, record: DocumentMeta) => (
        <div className="flex gap-3">
          <Link
            href={`/graph?doc=${record.id}`}
            className="text-blue-500 hover:text-blue-600 text-xs"
          >
            Graph
          </Link>
          <button
            onClick={() => handleDelete(record.id)}
            className="text-red-500 hover:text-red-600 text-xs"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document and all its chunks?")) return;
    try {
      await deleteDocument(id);
      onDelete();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleResize = useCallback(
    (index: number) =>
      (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
        setColumns((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], width: size.width };
          return next;
        });
      },
    [],
  );

  const mergedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column: ColumnsType<DocumentMeta>[number]) =>
      ({
        width: (column as { width?: number }).width,
        onResize: handleResize(index),
      }) as React.HTMLAttributes<HTMLTableCellElement>,
  }));

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#93c5fd",
          colorBgContainer: "#ffffff",
          colorBorderSecondary: "#e5e7eb",
          borderRadius: 12,
          fontSize: 14,
        },
        components: {
          Table: {
            headerBg: "#f9fafb",
            headerColor: "#374151",
            rowHoverBg: "#f3f4f6",
            borderColor: "#e5e7eb",
          },
        },
      }}
    >
      <Table<DocumentMeta>
        columns={mergedColumns}
        dataSource={documents}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: "max-content" }}
        components={{ header: { cell: ResizableTitle } }}
        locale={{ emptyText: "No documents uploaded yet" }}
      />
    </ConfigProvider>
  );
}
