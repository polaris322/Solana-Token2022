import {FC, useEffect, useState} from 'react';
import {TokenPropsType} from "../types/index";

interface TokenProps {
    open: boolean;
    isNew: boolean;
    name: string;
    symbol: string;
    uri: string,
    onSuccess: (TokenPropsType) => void;
    onCancel: () => void;
}

const Modal: FC<TokenProps> = ({isNew= false, open, name, symbol, uri, onSuccess, onCancel}) => {
    const [formData, setFormData] = useState<TokenPropsType>({name, symbol, uri});

    useEffect(() => {
        setFormData({
            name, symbol, uri
        });
    }, [name, symbol, uri]);

    /**
     * Submit token props
     * @param event
     */
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSuccess(formData);
    };

    /**
     * Handle user inputs for token props
     * @param event
     */
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        setFormData((prevFormData) => ({ ...prevFormData, [id]: value }));
    };

    return (
        <div>
            {open && (
                <div
                    className="fixed w-full bg-black bg-opacity-90 overflow-y-auto h-full w-full inset-0 z-50 flex items-center justify-center"
                    aria-hidden="true"
                    aria-labelledby="modal-title"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative p-4 w-full max-w-md h-full md:h-auto">
                        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                            <button
                                className="absolute top-0 right-0 mt-2 mr-2 text-white rounded-full text-md p-1.5 ml-auto inline-flex items-center z-51"
                                onClick={onCancel}>
                                ×
                            </button>
                            <div className="p-6 text-lg">
                                <h3
                                    className="mb-5 text-xl font-medium text-gray-900 dark:text-white"
                                    id="modal-title"
                                >
                                    {isNew? 'New Token' : 'Edit Token'}
                                </h3>
                                <form onSubmit={handleSubmit} className="pt-5">
                                    <div className="grid gap-6 mb-6">
                                        <div>
                                            <label
                                                htmlFor="name"
                                                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                            >
                                                Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                autoComplete="off"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="symbol"
                                                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                            >
                                                Symbol
                                            </label>
                                            <input
                                                type="text"
                                                id="symbol"
                                                autoComplete="off"
                                                value={formData.symbol}
                                                onChange={handleInputChange}
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="uri"
                                                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                            >
                                                URI
                                            </label>
                                            <input
                                                type="text"
                                                id="uri"
                                                autoComplete="off"
                                                value={formData.uri}
                                                onChange={handleInputChange}
                                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                                    >
                                        Submit
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Modal;