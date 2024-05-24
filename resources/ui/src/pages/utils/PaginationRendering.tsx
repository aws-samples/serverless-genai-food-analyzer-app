import React from "react";
import Pagination from "@cloudscape-design/components/pagination";

interface PaginationRenderingProps {
  numberOfItems: number;
  numberOfItemPerPage: number;
  pageIndex: number;
  onPageIndexChanged: (pageIndex: number) => void;
}

const PaginationRendering: React.FC<PaginationRenderingProps> = ({
  numberOfItems,
  numberOfItemPerPage,
  pageIndex,
  onPageIndexChanged,
}) => {
  const maxNumberOfPages = Math.ceil(numberOfItems / numberOfItemPerPage);

  return (
    <Pagination
      currentPageIndex={pageIndex}
      pagesCount={maxNumberOfPages}
      ariaLabels={{
        nextPageLabel: "Next page",
        previousPageLabel: "Previous page",
        pageLabel: (pageNumber) => `Page ${pageNumber} of all pages`,
      }}
      onChange={({ detail }) => {
        onPageIndexChanged(detail.currentPageIndex);
      }}
    />
  );
};

export default PaginationRendering;
