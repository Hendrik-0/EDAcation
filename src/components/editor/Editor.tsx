import {Box, Spinner, Text} from '@primer/react';
import React, {useCallback} from 'react';

import {useAppDispatch} from '../../store';
import {saveFile, changeFile, EditorFile, EditorFileLoaded} from '../../store/files';

import {EditorButtonYosys} from './buttons/EditorButtonYosys';
import {EditorButtonNextpnr} from './buttons/EditorButtonNextpnr';
import {BaseEditorProps} from './BaseEditor';
import {EditorGraphviz} from './EditorGraphviz';
import {EditorMonaco} from './EditorMonoca';
import {EditorDigitalJS} from './EditorDigitalJS';

const EDITORS_BY_EXTENSION: Record<string, React.FC<BaseEditorProps>> = {
    dot: EditorGraphviz,
    json: EditorDigitalJS
};

export interface EditorProps {
    panelId: string;
    files: EditorFile[];
    currentFileId: string;
}

export const Editor: React.FC<EditorProps> = ({panelId, files, currentFileId}) => {
    const dispatch = useAppDispatch();

    const handleSave = useCallback(
        (file: EditorFile) => {
            // TODO: Will generate an error if the content on disk was changed by antoher program.
            //       This should error should trigger a Primer React popup, which asks for confirmation.
            dispatch(saveFile({file}));
        },
        [dispatch]
    );

    const handleChange = useCallback(
        (file: EditorFile, content: string) => {
            dispatch(changeFile({
                fileId: file.id,
                content
            }));
        },
        [dispatch]
    );

    const file = files.length > 0 ? files.find((file) => file.id === currentFileId) : null;

    if (!file) {
        return <></>;
    }

    if (!file.isAccessible) {
        return (
            <Box p={2}>
                <Text>Grant permission to this file's storage provider to view the contents.</Text>
            </Box>
        );
    }

    if (!file.isLoaded) {
        return (
            <Box p={2}>
                <Spinner />
            </Box>
        );
    }

    const loadedFile = file as EditorFileLoaded;
    const extension = loadedFile.file.getExtension();

    const EditorType = EDITORS_BY_EXTENSION[extension] || EditorMonaco;

    return (
        <>
            <EditorType panelId={panelId} file={loadedFile} value={loadedFile.content} onChange={handleChange} onSave={handleSave} />

            <Box sx={{position: 'absolute', width: '100%', bottom: '0px', p: '2'}}>
                {extension === 'v' && <EditorButtonYosys panelId={panelId} file={loadedFile} />}
                {extension === 'v' && <EditorButtonNextpnr panelId={panelId} file={loadedFile} />}
            </Box>
        </>
    );
};
