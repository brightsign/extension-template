cmake_minimum_required(VERSION 3.10)
project(time_publisher VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(${PROJECT_NAME} src/main.cpp)

# Installation configuration
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/install
)

# Install the init scripts
install(FILES
    ${CMAKE_SOURCE_DIR}/sh/bsext_init
    ${CMAKE_SOURCE_DIR}/sh/start-ext.sh
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE
                GROUP_READ GROUP_EXECUTE
                WORLD_READ WORLD_EXECUTE
    DESTINATION ${CMAKE_SOURCE_DIR}/install
)