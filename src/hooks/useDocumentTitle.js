import { useLayoutEffect } from 'react';

const useDocumentTitle = (title) => {
  useLayoutEffect(() => {
    if (title) {
      document.title = title;
    } else {
      document.title = 'Specskart - Eyewear Store';
    }
  }, [title]);
};

export default useDocumentTitle;
